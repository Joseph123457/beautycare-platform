/**
 * 역할 기반 인가 미들웨어
 *
 * 사용법:
 *   router.get('/admin', authMiddleware, requireRole('SUPER_ADMIN'), handler);
 *   router.post('/feed', authMiddleware, requireRole('HOSPITAL_ADMIN', 'SUPER_ADMIN'), handler);
 *
 * auth 미들웨어 이후에 사용해야 req.user.role이 존재한다.
 */
const { errorResponse } = require('../utils/response');

/**
 * 허용된 역할만 접근 가능하도록 제한하는 미들웨어 팩토리
 * @param  {...string} roles - 허용할 역할 목록 (PATIENT, HOSPITAL_ADMIN, SUPER_ADMIN)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, '접근 권한이 없습니다', 403);
    }
    next();
  };
};

module.exports = { requireRole };
