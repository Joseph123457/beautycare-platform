/**
 * 인증 컨트롤러
 *
 * 엔드포인트:
 *   POST /api/auth/signup   — 일반 회원가입
 *   POST /api/auth/login    — 이메일/비밀번호 로그인
 *   POST /api/auth/kakao    — 카카오 소셜 로그인
 *   POST /api/auth/refresh  — 액세스 토큰 갱신
 *   POST /api/auth/logout   — 로그아웃 (리프레시 토큰 무효화)
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Hospital = require('../models/hospital');
const env = require('../config/env');
const { successResponse, errorResponse } = require('../utils/response');

// ─── 토큰 생성 헬퍼 ────────────────────────────────────

/**
 * 액세스 토큰 생성 (유효기간: 1일)
 * @param {object} user - { user_id, email }
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.user_id, email: user.email, type: 'access' },
    env.jwt.secret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
};

/**
 * 리프레시 토큰 생성 (유효기간: 30일)
 * @param {object} user - { user_id, email }
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.user_id, email: user.email, type: 'refresh' },
    env.jwt.secret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
};

/**
 * 액세스 + 리프레시 토큰 쌍 생성 및 DB 저장
 * @param {object} user - 사용자 객체
 * @returns {{ accessToken: string, refreshToken: string }}
 */
const issueTokens = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // 리프레시 토큰을 DB에 저장 (로그아웃 시 무효화 용도)
  await User.saveRefreshToken(user.user_id, refreshToken);

  return { accessToken, refreshToken };
};

// ─── 비밀번호 제외 헬퍼 ─────────────────────────────────

/**
 * 사용자 객체에서 민감 정보 제거
 * @param {object} user - DB에서 조회된 사용자 행
 */
const sanitizeUser = (user) => {
  const { password_hash, refresh_token, ...safe } = user;
  return safe;
};

// ─── 1. 회원가입 ────────────────────────────────────────

/**
 * POST /api/auth/signup
 *
 * 요청 body: { email, password, name, phone }
 * - 이메일 중복 확인
 * - bcrypt로 비밀번호 해싱 (salt round: 12)
 * - JWT 액세스 + 리프레시 토큰 발급
 */
const signup = async (req, res, next) => {
  try {
    const { email, password, name, phone } = req.body;

    // 이메일 중복 확인
    const existing = await User.findByEmail(email);
    if (existing) {
      return errorResponse(res, '이미 가입된 이메일입니다', 409);
    }

    // 비밀번호 해싱 (bcrypt, salt round 12)
    const hashedPassword = await bcrypt.hash(password, 12);

    // 사용자 생성
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      phone,
    });

    // 토큰 발급
    const tokens = await issueTokens(user);

    return successResponse(
      res,
      { user, ...tokens },
      '회원가입이 완료되었습니다',
      201
    );
  } catch (error) {
    next(error);
  }
};

// ─── 2. 로그인 ──────────────────────────────────────────

/**
 * POST /api/auth/login
 *
 * 요청 body: { email, password }
 * - 이메일로 사용자 조회
 * - bcrypt 비밀번호 비교
 * - JWT 액세스(1일) + 리프레시(30일) 토큰 반환
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 사용자 조회
    const user = await User.findByEmail(email);
    if (!user) {
      return errorResponse(res, '이메일 또는 비밀번호가 일치하지 않습니다', 401);
    }

    // 카카오 소셜 가입 사용자인 경우 일반 로그인 차단
    if (user.password_hash === 'KAKAO_SOCIAL') {
      return errorResponse(res, '카카오 로그인으로 가입된 계정입니다. 카카오 로그인을 이용해주세요', 400);
    }

    // 비밀번호 검증
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, '이메일 또는 비밀번호가 일치하지 않습니다', 401);
    }

    // 토큰 발급
    const tokens = await issueTokens(user);

    // 병원 소유자인 경우 hospital_id 포함
    const hospital = await Hospital.findByOwnerId(user.user_id);
    const safeUser = {
      ...sanitizeUser(user),
      hospital_id: hospital?.hospital_id || null,
    };

    return successResponse(res, {
      user: safeUser,
      ...tokens,
    }, '로그인 성공');
  } catch (error) {
    next(error);
  }
};

// ─── 3. 카카오 소셜 로그인 ──────────────────────────────

/**
 * POST /api/auth/kakao
 *
 * 요청 body: { kakaoAccessToken }
 *
 * 흐름:
 *   1) 클라이언트가 카카오 SDK로 받은 액세스 토큰을 전달
 *   2) 서버가 카카오 API(/v2/user/me)로 사용자 정보 조회
 *   3) kakao_id 로 DB 조회 → 기존 사용자면 로그인 / 없으면 자동 가입
 *   4) JWT 토큰 반환
 */
const kakaoLogin = async (req, res, next) => {
  try {
    const { kakaoAccessToken } = req.body;

    if (!kakaoAccessToken) {
      return errorResponse(res, '카카오 액세스 토큰이 필요합니다', 400);
    }

    // 카카오 API로 사용자 정보 조회
    const kakaoUser = await fetchKakaoUser(kakaoAccessToken);
    if (!kakaoUser) {
      return errorResponse(res, '카카오 인증에 실패했습니다', 401);
    }

    const { id: kakaoId, email, nickname } = kakaoUser;

    // 카카오 ID로 기존 사용자 조회
    let user = await User.findByKakaoId(kakaoId);

    if (!user) {
      // 신규 사용자 → 자동 가입
      // 이메일이 이미 존재하는 경우(일반 가입) 중복 방지
      if (email) {
        const emailUser = await User.findByEmail(email);
        if (emailUser) {
          return errorResponse(
            res,
            '해당 이메일로 이미 가입된 계정이 있습니다. 이메일 로그인을 이용해주세요',
            409
          );
        }
      }

      user = await User.createFromKakao({
        kakaoId,
        email: email || `kakao_${kakaoId}@placeholder.com`,
        name: nickname || `카카오사용자`,
      });
    }

    // 토큰 발급
    const tokens = await issueTokens(user);

    return successResponse(res, {
      user: sanitizeUser(user),
      ...tokens,
      isNewUser: !user.created_at || user.created_at === user.updated_at,
    }, '카카오 로그인 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * 카카오 API에서 사용자 정보 가져오기
 * @param {string} accessToken - 카카오 SDK에서 발급한 액세스 토큰
 * @returns {{ id: number, email: string|null, nickname: string|null } | null}
 */
const fetchKakaoUser = async (accessToken) => {
  try {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    if (!response.ok) {
      console.error('카카오 API 응답 에러:', response.status);
      return null;
    }

    const data = await response.json();

    return {
      id: data.id,
      email: data.kakao_account?.email || null,
      nickname: data.kakao_account?.profile?.nickname || null,
    };
  } catch (error) {
    console.error('카카오 API 호출 실패:', error.message);
    return null;
  }
};

// ─── 4. 토큰 갱신 ───────────────────────────────────────

/**
 * POST /api/auth/refresh
 *
 * 요청 body: { refreshToken }
 *
 * 검증 순서:
 *   1) JWT 유효성 (서명 + 만료) 확인
 *   2) 토큰 타입이 'refresh'인지 확인
 *   3) DB에 저장된 리프레시 토큰과 일치하는지 확인 (재사용 방지)
 *   4) 새 액세스 토큰 발급
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, '리프레시 토큰이 필요합니다', 400);
    }

    // JWT 검증
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, '리프레시 토큰이 만료되었습니다. 다시 로그인해주세요', 401);
      }
      return errorResponse(res, '유효하지 않은 리프레시 토큰입니다', 401);
    }

    // 토큰 타입 확인
    if (decoded.type !== 'refresh') {
      return errorResponse(res, '유효하지 않은 토큰 타입입니다', 401);
    }

    // DB에 저장된 토큰과 비교 (로그아웃된 토큰 재사용 방지)
    const storedToken = await User.getRefreshToken(decoded.id);
    if (!storedToken || storedToken !== refreshToken) {
      return errorResponse(res, '토큰이 무효화되었습니다. 다시 로그인해주세요', 401);
    }

    // 새 액세스 토큰 발급
    const accessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, type: 'access' },
      env.jwt.secret,
      { expiresIn: env.jwt.accessExpiresIn }
    );

    return successResponse(res, { accessToken }, '토큰이 갱신되었습니다');
  } catch (error) {
    next(error);
  }
};

// ─── 5. 로그아웃 ────────────────────────────────────────

/**
 * POST /api/auth/logout
 *
 * 인증 필요 (Authorization: Bearer {accessToken})
 * DB에서 리프레시 토큰을 삭제하여 무효화한다.
 */
const logout = async (req, res, next) => {
  try {
    // req.user는 auth 미들웨어에서 주입
    await User.clearRefreshToken(req.user.id);

    return successResponse(res, null, '로그아웃되었습니다');
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, login, kakaoLogin, refresh, logout };
