/**
 * 통역 서비스 컨트롤러
 *
 * 외국인 의료관광 환자를 위한 통역사 조회·예약·리뷰 기능을 처리한다.
 *
 * 엔드포인트:
 *   GET    /api/interpreters/available      — 가용 통역사 조회
 *   POST   /api/interpreters/book           — 통역 예약 (Stripe 결제)
 *   GET    /api/interpreters/my             — 내 통역 예약 목록
 *   POST   /api/interpreters/:id/review     — 통역사 리뷰
 *   POST   /api/admin/interpreters          — 통역사 등록 (관리자)
 */
const Stripe = require('stripe');
const env = require('../config/env');
const { pool } = require('../config/database');
const { Interpreter, InterpretationBooking } = require('../models/interpreter');
const Reservation = require('../models/reservation');
const { successResponse, errorResponse } = require('../utils/response');
const { sendPush } = require('../services/pushNotification');

// Stripe SDK 초기화 (설정이 없으면 null)
const stripe = env.stripe.secretKey
  ? new Stripe(env.stripe.secretKey)
  : null;

/* ── 환율 변환 헬퍼 (stripePayments.js와 동일 패턴) ──── */

let exchangeRateCache = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

/**
 * KRW → 외화 변환 (Stripe 최소 단위 적용)
 * @param {number} krwAmount - KRW 금액
 * @param {string} currency - 대상 통화 (USD/JPY/CNY)
 */
async function convertKrwToForeign(krwAmount, currency) {
  const now = Date.now();

  // 캐시가 유효하면 재사용
  if (exchangeRateCache && (now - exchangeRateCache.fetchedAt) < CACHE_TTL_MS) {
    const rate = exchangeRateCache.rates[currency];
    if (rate) {
      return calculateStripeAmount(krwAmount, rate, currency);
    }
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

  exchangeRateCache = { rates: data.rates, fetchedAt: now };

  const rate = data.rates[currency];
  if (!rate) {
    throw new Error(`지원하지 않는 통화입니다: ${currency}`);
  }

  return calculateStripeAmount(krwAmount, rate, currency);
}

/**
 * Stripe 금액 계산 헬퍼
 * JPY는 소수점 없는 통화, USD/CNY는 cents 단위
 */
function calculateStripeAmount(krwAmount, rate, currency) {
  const foreignAmount = krwAmount * rate;
  if (currency === 'JPY') {
    const rounded = Math.round(foreignAmount);
    return { stripeAmount: rounded, displayAmount: rounded };
  }
  const rounded = Math.round(foreignAmount * 100) / 100;
  return { stripeAmount: Math.round(foreignAmount * 100), displayAmount: rounded };
}

/* ── 1. 가용 통역사 조회 ─────────────────────────────── */

/**
 * GET /api/interpreters/available
 *
 * 인증 불필요 (공개 API)
 * 쿼리 파라미터:
 *   - language (필수): en | ja | zh
 *   - type (선택): PHONE | VISIT
 *   - date (선택): 희망 날짜 (YYYY-MM-DD)
 */
const getAvailableInterpreters = async (req, res, next) => {
  try {
    const { language, type, date } = req.query;

    // 언어 파라미터 필수 검증
    if (!language) {
      return errorResponse(res, '언어를 지정해주세요 (en, ja, zh)', 400);
    }

    // 지원 언어 검증
    const supportedLanguages = ['en', 'ja', 'zh'];
    if (!supportedLanguages.includes(language)) {
      return errorResponse(res, `지원하지 않는 언어입니다. (${supportedLanguages.join(', ')})`, 400);
    }

    // 통역 유형 검증 (입력된 경우)
    if (type && !['PHONE', 'VISIT'].includes(type)) {
      return errorResponse(res, '유형은 PHONE 또는 VISIT만 가능합니다', 400);
    }

    const interpreters = await Interpreter.findAvailable({ language, type, date });

    return successResponse(res, interpreters, '가용 통역사 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

/* ── 2. 통역 예약 ────────────────────────────────────── */

/**
 * POST /api/interpreters/book
 *
 * JWT 인증 필수
 * 요청 body:
 *   - reservation_id: 진료 예약 ID
 *   - interpreter_id: 통역사 ID
 *   - type: PHONE | VISIT
 *   - scheduled_at: 통역 예정 일시 (ISO8601)
 *   - duration_hours: 예상 소요 시간
 *   - currency (선택): USD | JPY | CNY (Stripe 결제 통화, 기본 USD)
 */
const bookInterpreter = async (req, res, next) => {
  try {
    const { reservation_id, interpreter_id, type, scheduled_at, duration_hours, currency = 'USD' } = req.body;

    // 진료 예약 존재 + 본인 확인
    const reservation = await Reservation.findById(reservation_id);
    if (!reservation) {
      return errorResponse(res, '진료 예약을 찾을 수 없습니다', 404);
    }
    if (reservation.user_id !== req.user.id) {
      return errorResponse(res, '본인의 진료 예약에만 통역을 예약할 수 있습니다', 403);
    }

    // 통역사 존재 + 가용 확인
    const interpreter = await Interpreter.findById(interpreter_id);
    if (!interpreter) {
      return errorResponse(res, '통역사를 찾을 수 없습니다', 404);
    }
    if (!interpreter.is_available) {
      return errorResponse(res, '현재 가용하지 않은 통역사입니다', 400);
    }

    // 통역 유형 호환성 검증
    if (type === 'PHONE' && interpreter.available_type === 'VISIT') {
      return errorResponse(res, '이 통역사는 전화 통역을 지원하지 않습니다', 400);
    }
    if (type === 'VISIT' && interpreter.available_type === 'PHONE') {
      return errorResponse(res, '이 통역사는 동행 통역을 지원하지 않습니다', 400);
    }

    // 총 요금 계산 (시간당 요금 × 시간)
    const totalFee = Math.round(interpreter.hourly_rate * duration_hours);

    // 통역 예약 생성
    const booking = await InterpretationBooking.create({
      reservation_id,
      interpreter_id,
      user_id: req.user.id,
      type,
      scheduled_at,
      duration_hours,
      total_fee: totalFee,
    });

    // Stripe 결제 처리 (설정된 경우)
    let paymentData = null;
    if (stripe && totalFee > 0) {
      // 통화 검증
      const supportedCurrencies = ['USD', 'JPY', 'CNY'];
      if (!supportedCurrencies.includes(currency)) {
        return errorResponse(res, `지원하지 않는 통화입니다. (${supportedCurrencies.join(', ')})`, 400);
      }

      // KRW → 외화 변환
      const { stripeAmount, displayAmount } = await convertKrwToForeign(totalFee, currency);

      // Stripe PaymentIntent 생성
      const paymentIntent = await stripe.paymentIntents.create({
        amount: stripeAmount,
        currency: currency.toLowerCase(),
        metadata: {
          booking_id: String(booking.booking_id),
          interpreter_id: String(interpreter_id),
          reservation_id: String(reservation_id),
          krw_amount: String(totalFee),
        },
        description: `BeautyCare interpretation - ${interpreter.name} / ${type}`,
      });

      // 결제 ID 저장
      await pool.query(
        `UPDATE interpretation_bookings
         SET stripe_payment_intent_id = $1
         WHERE booking_id = $2`,
        [paymentIntent.id, booking.booking_id]
      );

      paymentData = {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        fee_krw: totalFee,
        fee_foreign: displayAmount,
        currency,
      };
    }

    // 통역사에게 푸시 알림 발송 (통역사가 사용자 계정이 있는 경우)
    // 통역사 전용 user_id가 없으므로 이메일/전화 알림은 향후 확장
    // 현재는 로그만 남김
    console.log(`[INTERPRETER] 통역 예약 생성: booking_id=${booking.booking_id}, interpreter=${interpreter.name}`);

    return successResponse(res, {
      booking,
      payment: paymentData,
    }, '통역 예약이 생성되었습니다', 201);
  } catch (error) {
    next(error);
  }
};

/* ── 3. 내 통역 예약 목록 ────────────────────────────── */

/**
 * GET /api/interpreters/my
 *
 * JWT 인증 필수
 * 본인의 통역 예약 목록을 반환한다.
 */
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await InterpretationBooking.findByUserId(req.user.id);
    return successResponse(res, bookings, '내 통역 예약 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

/* ── 4. 통역사 리뷰 ─────────────────────────────────── */

/**
 * POST /api/interpreters/:id/review
 *
 * JWT 인증 필수
 * 요청 body:
 *   - booking_id: 통역 예약 ID
 *   - rating: 평점 (1~5)
 *   - content: 리뷰 내용
 *
 * 조건: 통역 상태가 DONE인 예약만 리뷰 가능
 */
const reviewInterpreter = async (req, res, next) => {
  try {
    const interpreterId = Number(req.params.id);
    const { booking_id, rating, content } = req.body;

    // 통역 예약 존재 확인
    const booking = await InterpretationBooking.findById(booking_id);
    if (!booking) {
      return errorResponse(res, '통역 예약을 찾을 수 없습니다', 404);
    }

    // 본인 예약 확인
    if (booking.user_id !== req.user.id) {
      return errorResponse(res, '본인의 통역 예약만 리뷰할 수 있습니다', 403);
    }

    // 통역사 ID 일치 확인
    if (booking.interpreter_id !== interpreterId) {
      return errorResponse(res, '해당 통역사의 예약이 아닙니다', 400);
    }

    // 완료된 예약만 리뷰 가능
    if (booking.status !== 'DONE') {
      return errorResponse(res, '완료된 통역만 리뷰할 수 있습니다', 400);
    }

    // 이미 리뷰가 있는지 확인
    if (booking.rating !== null) {
      return errorResponse(res, '이미 리뷰를 작성하였습니다', 409);
    }

    // 리뷰 저장
    const updated = await InterpretationBooking.addReview(booking_id, rating, content);

    // 통역사 평균 평점 갱신
    await Interpreter.updateRating(interpreterId);

    return successResponse(res, updated, '통역사 리뷰가 등록되었습니다');
  } catch (error) {
    next(error);
  }
};

/* ── 5. 관리자: 통역사 등록 ──────────────────────────── */

/**
 * POST /api/admin/interpreters
 *
 * JWT 인증 필수 (관리자 권한은 향후 미들웨어로 분리)
 * 요청 body:
 *   - name: 통역사 이름
 *   - phone: 전화번호
 *   - email: 이메일
 *   - languages: 가능 언어 배열 ['en', 'ja', 'zh']
 *   - available_type: PHONE | VISIT | BOTH
 *   - hourly_rate: 시간당 요금 (KRW)
 */
const createInterpreter = async (req, res, next) => {
  try {
    const { name, phone, email, languages, available_type, hourly_rate } = req.body;

    const interpreter = await Interpreter.create({
      name,
      phone,
      email,
      languages,
      available_type,
      hourly_rate,
    });

    return successResponse(res, interpreter, '통역사가 등록되었습니다', 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailableInterpreters,
  bookInterpreter,
  getMyBookings,
  reviewInterpreter,
  createInterpreter,
};
