/**
 * 인증 API 테스트
 *
 * 테스트 항목:
 *   1. 회원가입 → 로그인 → 토큰 검증 전체 흐름
 *   2. 중복 이메일 가입 시 409 에러 반환
 *   3. 잘못된 비밀번호 로그인 시 401 에러 반환
 *
 * 사전 조건:
 *   - TEST_DATABASE_URL로 접속 가능한 테스트 DB
 *   - 마이그레이션 실행 완료 (users 테이블 존재)
 */
const { pool } = require('../src/config/database');
const { signup, login, authGet } = require('./helpers');

// 테스트용 고유 이메일 (타임스탬프로 충돌 방지)
const SUFFIX = Date.now();
const TEST_EMAIL = `jest_auth_${SUFFIX}@test.com`;
const TEST_PASSWORD = 'test1234';
const TEST_NAME = '테스트사용자';
const TEST_PHONE = `010-0000-${String(SUFFIX).slice(-4)}`;

describe('인증 API (auth)', () => {
  // 테스트 종료 후 생성된 사용자 정리
  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [TEST_EMAIL]);
  });

  // ─────────────────────────────────────────────────────────
  // 1. 회원가입 → 로그인 → 토큰 검증 전체 흐름
  // ─────────────────────────────────────────────────────────
  describe('회원가입 → 로그인 → 토큰 검증 전체 흐름', () => {
    let accessToken;

    it('회원가입이 정상 동작한다 (201)', async () => {
      const res = await signup({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
        phone: TEST_PHONE,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(TEST_EMAIL);
      expect(res.body.data.user.name).toBe(TEST_NAME);
      // 토큰이 발급되어야 한다
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('가입한 계정으로 로그인이 정상 동작한다 (200)', async () => {
      const res = await login(TEST_EMAIL, TEST_PASSWORD);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(TEST_EMAIL);
      expect(res.body.data.accessToken).toBeDefined();

      accessToken = res.body.data.accessToken;
    });

    it('발급받은 토큰으로 인증된 API 요청이 가능하다 (200)', async () => {
      // 예약 목록 조회는 인증 필요 엔드포인트
      const res = await authGet('/api/reservations', accessToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('토큰 없이 인증 필요 API에 접근하면 401을 반환한다', async () => {
      const res = await authGet('/api/reservations', '');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 2. 중복 이메일 가입 시 409 에러 반환
  // ─────────────────────────────────────────────────────────
  describe('중복 이메일 가입 시 409 에러 반환', () => {
    it('이미 존재하는 이메일로 가입하면 409를 반환한다', async () => {
      const res = await signup({
        email: TEST_EMAIL,
        password: 'another1234',
        name: '중복가입테스트',
        phone: `010-0001-${String(SUFFIX).slice(-4)}`,
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('이미 가입된');
    });
  });

  // ─────────────────────────────────────────────────────────
  // 3. 잘못된 비밀번호 로그인 시 401 에러 반환
  // ─────────────────────────────────────────────────────────
  describe('잘못된 비밀번호 로그인 시 401 에러 반환', () => {
    it('비밀번호가 틀리면 401을 반환한다', async () => {
      const res = await login(TEST_EMAIL, 'wrongpassword');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('일치하지 않습니다');
    });

    it('존재하지 않는 이메일로 로그인하면 401을 반환한다', async () => {
      const res = await login('nonexistent_user_xyz@test.com', 'test1234');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
