/**
 * 구독 플랜 기반 접근 제어 미들웨어
 *
 * 병원 소유자의 구독 등급에 따라 기능 접근을 제한한다.
 * - requireBasic: BASIC 이상 (BASIC, PRO)
 * - requirePro: PRO만
 *
 * 사전 조건: authMiddleware가 먼저 실행되어 req.user가 존재해야 한다.
 */
const Hospital = require('../models/hospital');
const { errorResponse } = require('../utils/response');

// 등급 우선순위 (숫자가 클수록 상위 플랜)
const TIER_LEVEL = {
  FREE: 0,
  BASIC: 1,
  PRO: 2,
};

/**
 * 공통 플랜 검증 함수
 * @param {number} requiredLevel - 필요한 최소 플랜 레벨
 * @param {string} planName - 에러 메시지에 표시할 플랜 이름
 */
const requireTier = (requiredLevel, planName) => {
  return async (req, res, next) => {
    try {
      // 인증된 사용자의 병원 조회
      const hospital = await Hospital.findByOwnerId(req.user.id);
      if (!hospital) {
        return errorResponse(res, '등록된 병원이 없습니다', 404);
      }

      // 구독 등급 확인
      const currentLevel = TIER_LEVEL[hospital.subscription_tier] || 0;
      if (currentLevel < requiredLevel) {
        return errorResponse(
          res,
          `이 기능은 ${planName} 플랜 이상에서 사용 가능합니다`,
          403
        );
      }

      // 병원 정보를 req에 주입 (이후 컨트롤러에서 재조회 방지)
      req.hospital = hospital;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// BASIC 이상 필요 (BASIC, PRO 접근 가능)
const requireBasic = requireTier(TIER_LEVEL.BASIC, 'BASIC');

// PRO 필요 (PRO만 접근 가능)
const requirePro = requireTier(TIER_LEVEL.PRO, 'PRO');

module.exports = { requireBasic, requirePro };
