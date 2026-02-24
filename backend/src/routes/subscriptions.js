/**
 * 구독 라우트
 *
 * 공개 엔드포인트:
 *   GET /plans                — 플랜 목록 및 가격 조회
 *
 * 인증 필요 엔드포인트:
 *   GET  /my                  — 내 구독 현황 조회
 *   POST /checkout            — 구독 결제 시작
 *   POST /confirm             — 결제 확인 및 구독 활성화
 *   POST /cancel              — 구독 취소
 */
const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  getPlans,
  getMySubscription,
  checkout,
  confirmPayment,
  cancelSubscription,
} = require('../controllers/subscriptions');

const router = express.Router();

// ─── 결제 시작 유효성 검사 ───────────────────────────────
const checkoutValidation = [
  body('tier')
    .isIn(['BASIC', 'PRO']).withMessage('플랜은 BASIC 또는 PRO만 가능합니다'),
  body('billing_period')
    .isIn(['monthly', 'yearly']).withMessage('결제 주기는 monthly 또는 yearly만 가능합니다'),
];

// ─── 결제 확인 유효성 검사 ───────────────────────────────
const confirmValidation = [
  body('authKey')
    .notEmpty().withMessage('인증 키가 필요합니다'),
  body('customerKey')
    .notEmpty().withMessage('고객 키가 필요합니다'),
  body('tier')
    .isIn(['BASIC', 'PRO']).withMessage('유효하지 않은 플랜입니다'),
];

// ─── 공개 라우트 ─────────────────────────────────────────

// GET /api/subscriptions/plans — 플랜 목록 조회
router.get('/plans', getPlans);

// ─── 인증 필요 라우트 ────────────────────────────────────

// GET /api/subscriptions/my — 내 구독 현황
router.get('/my', authMiddleware, getMySubscription);

// POST /api/subscriptions/checkout — 결제 시작
router.post('/checkout', authMiddleware, checkoutValidation, validate, checkout);

// POST /api/subscriptions/confirm — 결제 확인
router.post('/confirm', confirmValidation, validate, confirmPayment);

// POST /api/subscriptions/cancel — 구독 취소
router.post('/cancel', authMiddleware, cancelSubscription);

module.exports = router;
