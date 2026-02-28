/**
 * JWT 인증 미들웨어
 *
 * Authorization: Bearer {accessToken} 헤더를 검증한다.
 * - 토큰이 없거나 형식이 잘못된 경우 → 401
 * - 토큰 만료 → 401 (TOKEN_EXPIRED 코드 포함, 클라이언트가 /refresh 호출 유도)
 * - 유효하지 않은 서명 → 401
 * - type이 'access'가 아닌 경우 → 401
 * - 검증 성공 → req.user에 { id, email } 주입
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { errorResponse } = require('../utils/response');

const authMiddleware = (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, '인증 토큰이 필요합니다', 401);
    }

    const token = authHeader.split(' ')[1];

    // JWT 검증
    const decoded = jwt.verify(token, env.jwt.secret);

    // 액세스 토큰만 허용 (리프레시 토큰으로 API 접근 차단)
    if (decoded.type !== 'access') {
      return errorResponse(res, '유효하지 않은 토큰 타입입니다', 401);
    }

    // req.user에 사용자 정보 주입 (역할 포함)
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // 클라이언트가 이 코드를 보고 /api/auth/refresh 호출
      return res.status(401).json({
        success: false,
        data: null,
        message: '토큰이 만료되었습니다',
        code: 'TOKEN_EXPIRED',
      });
    }
    return errorResponse(res, '유효하지 않은 토큰입니다', 401);
  }
};

module.exports = authMiddleware;
