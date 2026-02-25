/**
 * Stripe 결제 라우트
 *
 * 외국인 예약금 결제 API 엔드포인트를 정의한다.
 *
 * 주의: webhook 엔드포인트는 raw body가 필요하므로
 *       app.js에서 express.json() 전에 별도 마운트한다.
 */
const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  createPaymentIntent,
  handleWebhook,
  refundDeposit,
} = require('../controllers/stripePayments');

// ─── 일반 라우터 (JSON body) ────────────────────────
const router = express.Router();

// POST /api/payments/stripe/create-intent — PaymentIntent 생성
router.post(
  '/create-intent',
  authMiddleware,
  [
    body('reservation_id').isInt().withMessage('예약 ID를 입력해주세요'),
    body('currency').isIn(['USD', 'JPY', 'CNY']).withMessage('지원하는 통화를 선택해주세요 (USD, JPY, CNY)'),
  ],
  validate,
  createPaymentIntent
);

// POST /api/payments/stripe/refund — 예약금 환불
router.post(
  '/refund',
  authMiddleware,
  [
    body('reservation_id').isInt().withMessage('예약 ID를 입력해주세요'),
  ],
  validate,
  refundDeposit
);

// ─── 웹훅 라우터 (raw body) ─────────────────────────
// app.js에서 express.json() 전에 별도 마운트해야 한다.
const webhookRouter = express.Router();
webhookRouter.post('/', handleWebhook);

module.exports = router;
module.exports.webhookRouter = webhookRouter;
