/**
 * 사용자 라우트
 *
 * 인증 필요 엔드포인트:
 *   PATCH /push-token — 푸시 알림 토큰 저장
 */
const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const User = require('../models/user');

const router = express.Router();

// ─── 푸시 토큰 유효성 검사 ─────────────────────────────
const pushTokenValidation = [
  body('pushToken')
    .notEmpty().withMessage('푸시 토큰이 필요합니다')
    .isString().withMessage('푸시 토큰은 문자열이어야 합니다'),
];

// PATCH /api/users/push-token — 푸시 토큰 저장
router.patch('/push-token', authMiddleware, pushTokenValidation, validate, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { pushToken } = req.body;

    await User.updatePushToken(userId, pushToken);

    res.json({
      success: true,
      data: null,
      message: '푸시 토큰이 저장되었습니다',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
