/**
 * Stripe 외국인 결제 컨트롤러
 *
 * 외국인 의료관광 환자의 예약금(deposit) 결제를 처리한다.
 * USD/JPY/CNY → KRW 환산 구조.
 *
 * 엔드포인트:
 *   POST /api/payments/stripe/create-intent — PaymentIntent 생성 (client_secret 반환)
 *   POST /api/payments/stripe/confirm       — Stripe 웹훅 수신 (서명 검증)
 *   POST /api/payments/stripe/refund        — 예약금 환불
 */
const Stripe = require('stripe');
const env = require('../config/env');
const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { sendPushBulk, getHospitalStaffIds } = require('../services/pushNotification');

// Stripe SDK 초기화
const stripe = env.stripe.secretKey
  ? new Stripe(env.stripe.secretKey)
  : null;

/* ── 환율 변환 헬퍼 ─────────────────────────────────── */

// 메모리 캐시: { rates, fetchedAt }
let exchangeRateCache = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

/**
 * KRW 기준 환율 조회 (open.er-api.com)
 * @param {string} currency - 대상 통화 (USD/JPY/CNY)
 * @returns {number} 1 KRW = ? target currency
 */
async function getExchangeRate(currency) {
  const now = Date.now();

  // 캐시가 유효하면 재사용
  if (exchangeRateCache && (now - exchangeRateCache.fetchedAt) < CACHE_TTL_MS) {
    const rate = exchangeRateCache.rates[currency];
    if (rate) return rate;
  }

  // 환율 API 호출
  const response = await fetch('https://open.er-api.com/v6/latest/KRW');
  if (!response.ok) {
    throw new Error('환율 API 호출 실패');
  }

  const data = await response.json();
  if (data.result !== 'success') {
    throw new Error('환율 데이터 조회 실패');
  }

  // 캐시 갱신
  exchangeRateCache = {
    rates: data.rates,
    fetchedAt: now,
  };

  const rate = data.rates[currency];
  if (!rate) {
    throw new Error(`지원하지 않는 통화입니다: ${currency}`);
  }

  return rate;
}

/**
 * KRW 금액을 외화로 변환 (Stripe 최소 단위 적용)
 * - USD/CNY: cents (× 100)
 * - JPY: 원 단위 그대로 (소수점 없음)
 * @param {number} krwAmount - KRW 금액
 * @param {string} currency - 대상 통화
 * @returns {{ stripeAmount: number, displayAmount: number }}
 */
async function convertKrwToForeign(krwAmount, currency) {
  const rate = await getExchangeRate(currency);
  const foreignAmount = krwAmount * rate;

  if (currency === 'JPY') {
    // JPY는 소수점 없는 통화 → 반올림하여 그대로 사용
    const rounded = Math.round(foreignAmount);
    return { stripeAmount: rounded, displayAmount: rounded };
  }

  // USD, CNY 등 소수점 2자리 통화 → cents 단위로 변환
  const rounded = Math.round(foreignAmount * 100) / 100;
  return { stripeAmount: Math.round(foreignAmount * 100), displayAmount: rounded };
}

/* ── 1. PaymentIntent 생성 ─────────────────────────── */

/**
 * POST /api/payments/stripe/create-intent
 *
 * 인증 필수
 * 요청 body: { reservation_id, currency }
 *
 * 예약의 시술 금액에서 deposit_rate(기본 20%)를 적용하여
 * KRW 예약금을 산출하고, 환율 변환 후 Stripe PaymentIntent를 생성한다.
 */
const createPaymentIntent = async (req, res, next) => {
  try {
    if (!stripe) {
      return errorResponse(res, 'Stripe가 설정되지 않았습니다', 503);
    }

    const { reservation_id, currency } = req.body;

    // 통화 검증
    const supportedCurrencies = ['USD', 'JPY', 'CNY'];
    if (!supportedCurrencies.includes(currency)) {
      return errorResponse(res, `지원하지 않는 통화입니다. (${supportedCurrencies.join(', ')})`, 400);
    }

    // 예약 조회 (본인 예약만)
    const { rows: reservations } = await pool.query(
      `SELECT r.reservation_id, r.user_id, r.hospital_id, r.treatment_name,
              r.status, r.deposit_paid, r.stripe_payment_intent_id,
              h.name AS hospital_name, h.deposit_rate
       FROM reservations r
       JOIN hospitals h ON r.hospital_id = h.hospital_id
       WHERE r.reservation_id = $1`,
      [reservation_id]
    );

    if (reservations.length === 0) {
      return errorResponse(res, '예약을 찾을 수 없습니다', 404);
    }

    const reservation = reservations[0];

    // 본인 예약 확인
    if (reservation.user_id !== req.user.id) {
      return errorResponse(res, '본인의 예약만 결제할 수 있습니다', 403);
    }

    // 이미 결제 완료된 경우
    if (reservation.deposit_paid) {
      return errorResponse(res, '이미 예약금이 결제되었습니다', 409);
    }

    // 이미 PaymentIntent가 있는 경우 → 기존 것 반환
    if (reservation.stripe_payment_intent_id) {
      const existingPi = await stripe.paymentIntents.retrieve(reservation.stripe_payment_intent_id);
      if (existingPi.status !== 'canceled' && existingPi.status !== 'succeeded') {
        return successResponse(res, {
          client_secret: existingPi.client_secret,
          payment_intent_id: existingPi.id,
          amount: existingPi.amount,
          currency: existingPi.currency,
        }, '기존 결제 정보를 반환합니다');
      }
    }

    // 시술 가격 조회 (treatments 테이블 또는 예약의 price)
    const { rows: treatments } = await pool.query(
      `SELECT price FROM treatments
       WHERE hospital_id = $1 AND name = $2 AND is_active = true
       LIMIT 1`,
      [reservation.hospital_id, reservation.treatment_name]
    );

    // 시술 가격이 없으면 기본 500,000원
    const treatmentPrice = treatments.length > 0 ? treatments[0].price : 500000;

    // 예약금 산출 (병원 deposit_rate, 기본 20%)
    const depositRate = reservation.deposit_rate || 0.2;
    const krwDepositAmount = Math.round(treatmentPrice * depositRate);

    // KRW → 외화 변환
    const { stripeAmount, displayAmount } = await convertKrwToForeign(krwDepositAmount, currency);

    // Stripe PaymentIntent 생성
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: currency.toLowerCase(),
      metadata: {
        reservation_id: String(reservation_id),
        krw_amount: String(krwDepositAmount),
        hospital_id: String(reservation.hospital_id),
      },
      description: `BeautyCare deposit - ${reservation.hospital_name} / ${reservation.treatment_name}`,
    });

    // 예약 테이블에 결제 정보 저장
    await pool.query(
      `UPDATE reservations
       SET deposit_amount = $1,
           deposit_currency = $2,
           stripe_payment_intent_id = $3,
           updated_at = NOW()
       WHERE reservation_id = $4`,
      [krwDepositAmount, currency, paymentIntent.id, reservation_id]
    );

    return successResponse(res, {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      deposit_krw: krwDepositAmount,
      deposit_foreign: displayAmount,
      currency,
    }, '결제 정보가 생성되었습니다');
  } catch (error) {
    next(error);
  }
};

/* ── 2. Stripe 웹훅 처리 ──────────────────────────── */

/**
 * POST /api/payments/stripe/confirm
 *
 * Stripe 서명 검증 후 payment_intent.succeeded 이벤트를 처리한다.
 * - 예약의 deposit_paid = true 업데이트
 * - 병원 스태프에게 예약금 입금 알림 발송
 */
const handleWebhook = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    // Stripe 서명 검증
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, env.stripe.webhookSecret);
    } catch (err) {
      console.error('[STRIPE] 웹훅 서명 검증 실패:', err.message);
      return res.status(400).json({ error: '웹훅 서명 검증 실패' });
    }

    // payment_intent.succeeded 이벤트 처리
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const reservationId = paymentIntent.metadata.reservation_id;
      const krwAmount = paymentIntent.metadata.krw_amount;

      if (!reservationId) {
        console.warn('[STRIPE] 웹훅: metadata에 reservation_id 없음');
        return res.status(200).json({ received: true });
      }

      // 예약 조회
      const { rows } = await pool.query(
        `SELECT r.reservation_id, r.hospital_id, r.deposit_currency,
                u.name AS patient_name, h.name AS hospital_name
         FROM reservations r
         JOIN users u ON r.user_id = u.user_id
         JOIN hospitals h ON r.hospital_id = h.hospital_id
         WHERE r.reservation_id = $1`,
        [reservationId]
      );

      if (rows.length === 0) {
        console.warn(`[STRIPE] 웹훅: 예약 ${reservationId} 찾을 수 없음`);
        return res.status(200).json({ received: true });
      }

      const reservation = rows[0];

      // deposit_paid = true 업데이트
      await pool.query(
        `UPDATE reservations
         SET deposit_paid = true, updated_at = NOW()
         WHERE reservation_id = $1`,
        [reservationId]
      );

      console.log(`[STRIPE] 예약금 결제 완료: reservation_id=${reservationId}, amount=${krwAmount} KRW`);

      // 병원에 입금 알림 발송 (비동기, 실패해도 웹훅 응답에 영향 없음)
      notifyDepositPaid(
        reservation.hospital_id,
        reservation.patient_name,
        krwAmount,
        reservation.deposit_currency
      ).catch((err) => {
        console.error('[STRIPE] 입금 알림 발송 실패:', err.message);
      });
    }

    // 빠르게 200 반환
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[STRIPE] 웹훅 처리 오류:', error.message);
    return res.status(500).json({ error: '웹훅 처리 오류' });
  }
};

/* ── 3. 예약금 환불 ───────────────────────────────── */

/**
 * POST /api/payments/stripe/refund
 *
 * 인증 필수
 * 요청 body: { reservation_id }
 *
 * 환불 정책:
 *   - 예약일 7일 전 이상: 100% 환불
 *   - 3~7일 전: 50% 환불
 *   - 3일 이내: 환불 불가
 */
const refundDeposit = async (req, res, next) => {
  try {
    if (!stripe) {
      return errorResponse(res, 'Stripe가 설정되지 않았습니다', 503);
    }

    const { reservation_id } = req.body;

    // 예약 조회
    const { rows } = await pool.query(
      `SELECT r.reservation_id, r.user_id, r.hospital_id, r.reserved_at,
              r.deposit_amount, r.deposit_currency, r.deposit_paid,
              r.stripe_payment_intent_id, r.status
       FROM reservations r
       WHERE r.reservation_id = $1`,
      [reservation_id]
    );

    if (rows.length === 0) {
      return errorResponse(res, '예약을 찾을 수 없습니다', 404);
    }

    const reservation = rows[0];

    // 본인 예약 확인
    if (reservation.user_id !== req.user.id) {
      return errorResponse(res, '본인의 예약만 환불할 수 있습니다', 403);
    }

    // 결제 여부 확인
    if (!reservation.deposit_paid || !reservation.stripe_payment_intent_id) {
      return errorResponse(res, '결제된 예약금이 없습니다', 400);
    }

    // 이미 취소된 예약인지 확인
    if (reservation.status === 'CANCELLED') {
      return errorResponse(res, '이미 취소된 예약입니다', 400);
    }

    // 환불 비율 계산 (예약일 기준)
    const now = new Date();
    const reservedAt = new Date(reservation.reserved_at);
    const daysUntilReservation = Math.ceil((reservedAt - now) / (1000 * 60 * 60 * 24));

    let refundPercent;
    if (daysUntilReservation >= 7) {
      refundPercent = 100;
    } else if (daysUntilReservation >= 3) {
      refundPercent = 50;
    } else {
      return errorResponse(res, '예약일 3일 이내에는 환불이 불가합니다', 400);
    }

    // PaymentIntent에서 실제 결제 금액 조회
    const paymentIntent = await stripe.paymentIntents.retrieve(reservation.stripe_payment_intent_id);
    const refundAmount = Math.round(paymentIntent.amount * refundPercent / 100);

    // Stripe 환불 실행
    const refund = await stripe.refunds.create({
      payment_intent: reservation.stripe_payment_intent_id,
      amount: refundAmount,
    });

    // 예약 상태 CANCELLED로 업데이트
    await pool.query(
      `UPDATE reservations
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE reservation_id = $1`,
      [reservation_id]
    );

    return successResponse(res, {
      refund_id: refund.id,
      refund_percent: refundPercent,
      refund_amount: refundAmount,
      currency: reservation.deposit_currency,
      days_until_reservation: daysUntilReservation,
    }, `예약금 ${refundPercent}% 환불이 처리되었습니다`);
  } catch (error) {
    next(error);
  }
};

/* ── 예약금 입금 알림 ─────────────────────────────── */

/**
 * 병원 스태프에게 예약금 입금 완료 알림 발송
 * @param {number} hospitalId - 병원 ID
 * @param {string} patientName - 환자명
 * @param {string|number} amount - 입금액 (KRW)
 * @param {string} currency - 결제 통화
 */
async function notifyDepositPaid(hospitalId, patientName, amount, currency) {
  try {
    const staffIds = await getHospitalStaffIds(hospitalId);
    if (staffIds.length === 0) return;

    return sendPushBulk(
      staffIds,
      'DEPOSIT_PAID',
      '예약금 입금 완료',
      `${patientName} 환자의 예약금 ${Number(amount).toLocaleString()}원 (${currency})이 입금되었습니다`,
      { hospitalId, screen: 'DashboardReservations' }
    );
  } catch (error) {
    console.error('[STRIPE] 예약금 알림 발송 오류:', error.message);
  }
}

module.exports = {
  createPaymentIntent,
  handleWebhook,
  refundDeposit,
  notifyDepositPaid,
};
