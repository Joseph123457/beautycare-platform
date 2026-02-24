/**
 * 구독 컨트롤러
 *
 * 토스페이먼츠 정기결제 API 연동
 * - 빌링키 발급 → 자동 결제 → 구독 활성화 플로우
 *
 * 엔드포인트:
 *   GET  /api/subscriptions/plans    — 플랜 목록 및 가격 조회
 *   GET  /api/subscriptions/my       — 내 구독 현황 조회
 *   POST /api/subscriptions/checkout — 구독 결제 시작 (빌링키 발급 URL 반환)
 *   POST /api/subscriptions/confirm  — 결제 확인 및 구독 활성화
 *   POST /api/subscriptions/cancel   — 구독 취소
 */
const env = require('../config/env');
const { pool } = require('../config/database');
const Hospital = require('../models/hospital');
const Subscription = require('../models/subscription');
const Payment = require('../models/payment');
const { successResponse, errorResponse } = require('../utils/response');

// ─── 플랜 정의 ──────────────────────────────────────────

const PLANS = {
  FREE: {
    tier: 'FREE',
    name: '무료',
    monthly_price: 0,
    yearly_price: 0,
    features: ['기본 프로필', '기본 노출'],
  },
  BASIC: {
    tier: 'BASIC',
    name: '베이직',
    monthly_price: 39000,
    yearly_price: 39000 * 10,  // 연간 결제 시 2개월 할인
    features: ['예약 관리', '환자 CRM', '월간 통계'],
  },
  PRO: {
    tier: 'PRO',
    name: '프로',
    monthly_price: 79000,
    yearly_price: 79000 * 10,  // 연간 결제 시 2개월 할인
    features: ['AI 리뷰 분석', '실시간 채팅', '마케팅 자동화', '예약 관리', '환자 CRM', '월간 통계'],
  },
};

// ─── 토스페이먼츠 API 헬퍼 ───────────────────────────────

const TOSS_API_BASE = 'https://api.tosspayments.com/v1/billing';

/**
 * 토스페이먼츠 API 호출 공통 함수
 * Basic 인증: secretKey를 Base64 인코딩하여 헤더에 포함
 * @param {string} endpoint - API 경로
 * @param {string} method - HTTP 메서드
 * @param {object|null} body - 요청 바디
 */
const callTossAPI = async (endpoint, method = 'POST', body = null) => {
  // 시크릿 키를 Base64 인코딩 (토스 인증 규격)
  const credentials = Buffer.from(`${env.toss.secretKey}:`).toString('base64');

  const options = {
    method,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${TOSS_API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    console.error('토스페이먼츠 API 에러:', data);
    throw new Error(data.message || '토스페이먼츠 API 요청 실패');
  }

  return data;
};

// ─── 내부 헬퍼 ──────────────────────────────────────────

/**
 * 결제 금액 계산
 * @param {string} tier - 플랜 등급 (BASIC|PRO)
 * @param {string} period - 결제 주기 (monthly|yearly)
 * @returns {number} 결제 금액 (원)
 */
const calculateAmount = (tier, period) => {
  const plan = PLANS[tier];
  if (!plan) return 0;
  return period === 'yearly' ? plan.yearly_price : plan.monthly_price;
};

/**
 * 구독 만료일 계산
 * @param {string} period - 결제 주기 (monthly|yearly)
 * @returns {Date} 만료일
 */
const calculateExpiresAt = (period) => {
  const now = new Date();
  if (period === 'yearly') {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    now.setMonth(now.getMonth() + 1);
  }
  return now;
};

// ─── 1. 플랜 목록 조회 ──────────────────────────────────

/**
 * GET /api/subscriptions/plans
 *
 * 인증 불필요
 * 모든 구독 플랜의 가격과 기능 목록을 반환한다.
 */
const getPlans = async (req, res, next) => {
  try {
    const plans = Object.values(PLANS).map((plan) => ({
      ...plan,
      yearly_monthly_price: plan.yearly_price > 0
        ? Math.round(plan.yearly_price / 12)
        : 0,
    }));

    return successResponse(res, { plans }, '플랜 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

// ─── 2. 내 구독 현황 조회 ───────────────────────────────

/**
 * GET /api/subscriptions/my
 *
 * 인증 필수 (병원 소유자)
 * 현재 플랜, 결제일, 다음 결제 예정일, 결제 내역을 반환한다.
 */
const getMySubscription = async (req, res, next) => {
  try {
    // 사용자의 병원 조회
    const hospital = await Hospital.findByOwnerId(req.user.id);
    if (!hospital) {
      return errorResponse(res, '등록된 병원이 없습니다', 404);
    }

    // 활성 구독 조회
    const subscription = await Subscription.findActiveByHospitalId(hospital.hospital_id);

    // 결제 내역 조회
    const payments = await Payment.findAllByHospitalId(hospital.hospital_id);

    return successResponse(res, {
      current_tier: hospital.subscription_tier,
      subscription: subscription || null,
      payments,
    }, '구독 현황 조회 성공');
  } catch (error) {
    next(error);
  }
};

// ─── 3. 구독 결제 시작 ──────────────────────────────────

/**
 * POST /api/subscriptions/checkout
 *
 * 인증 필수 (병원 소유자)
 * 요청 body: { tier: 'BASIC'|'PRO', billing_period: 'monthly'|'yearly' }
 *
 * 토스페이먼츠 빌링키 발급을 위한 인증 URL을 반환한다.
 * 클라이언트는 이 URL로 카드 등록 페이지를 열어야 한다.
 */
const checkout = async (req, res, next) => {
  try {
    const { tier, billing_period } = req.body;

    // 입력 검증
    if (!['BASIC', 'PRO'].includes(tier)) {
      return errorResponse(res, '유효하지 않은 플랜입니다 (BASIC 또는 PRO)', 400);
    }
    if (!['monthly', 'yearly'].includes(billing_period)) {
      return errorResponse(res, '유효하지 않은 결제 주기입니다 (monthly 또는 yearly)', 400);
    }

    // 병원 소유자 확인
    const hospital = await Hospital.findByOwnerId(req.user.id);
    if (!hospital) {
      return errorResponse(res, '등록된 병원이 없습니다', 404);
    }

    // 이미 같은 등급 구독 중인지 확인
    const existing = await Subscription.findActiveByHospitalId(hospital.hospital_id);
    if (existing && existing.tier === tier) {
      return errorResponse(res, `이미 ${PLANS[tier].name} 플랜을 구독 중입니다`, 409);
    }

    // 결제 금액 계산
    const amount = calculateAmount(tier, billing_period);

    // 고유 주문 ID 생성 (병원ID_타임스탬프)
    const orderId = `SUB_${hospital.hospital_id}_${Date.now()}`;

    // 토스페이먼츠 빌링키 발급 요청 URL 구성
    // 클라이언트가 이 URL로 이동하여 카드 정보를 입력한다
    const checkoutData = {
      orderName: `뷰티케어 ${PLANS[tier].name} 플랜 (${billing_period === 'yearly' ? '연간' : '월간'})`,
      orderId,
      amount,
      tier,
      billing_period,
      hospital_id: hospital.hospital_id,
      // 토스페이먼츠 빌링 위젯에 전달할 customerKey
      customerKey: `hospital_${hospital.hospital_id}`,
      // 성공/실패 리다이렉트 URL (프론트엔드에서 처리)
      successUrl: `${req.protocol}://${req.get('host')}/api/subscriptions/confirm`,
      failUrl: `${req.protocol}://${req.get('host')}/api/subscriptions/fail`,
    };

    return successResponse(res, checkoutData, '결제 정보가 생성되었습니다');
  } catch (error) {
    next(error);
  }
};

// ─── 4. 결제 확인 및 구독 활성화 ────────────────────────

/**
 * POST /api/subscriptions/confirm
 *
 * 토스페이먼츠 결제 승인 처리
 * 요청 body: { authKey, customerKey, tier, billing_period }
 *
 * 흐름:
 *   1) authKey로 빌링키 발급 (토스 API)
 *   2) 빌링키로 자동 결제 승인 (토스 API)
 *   3) payments 테이블에 결제 내역 저장
 *   4) subscriptions 테이블에 구독 생성
 *   5) hospitals.subscription_tier 업데이트
 */
const confirmPayment = async (req, res, next) => {
  try {
    const { authKey, customerKey, tier, billing_period } = req.body;

    // 입력 검증
    if (!authKey || !customerKey) {
      return errorResponse(res, '인증 정보가 필요합니다', 400);
    }
    if (!['BASIC', 'PRO'].includes(tier)) {
      return errorResponse(res, '유효하지 않은 플랜입니다', 400);
    }

    // customerKey에서 병원 ID 추출
    const hospitalId = parseInt(customerKey.replace('hospital_', ''), 10);
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return errorResponse(res, '병원 정보를 찾을 수 없습니다', 404);
    }

    // 결제 금액 계산
    const amount = calculateAmount(tier, billing_period || 'monthly');
    const expiresAt = calculateExpiresAt(billing_period || 'monthly');

    // 1) 토스페이먼츠 빌링키 발급
    const billingData = await callTossAPI('/authorizations/issue', 'POST', {
      authKey,
      customerKey,
    });
    const billingKey = billingData.billingKey;

    // 2) 빌링키로 자동 결제 승인
    const orderId = `SUB_${hospitalId}_${Date.now()}`;
    const paymentData = await callTossAPI(`/${billingKey}`, 'POST', {
      customerKey,
      amount,
      orderId,
      orderName: `뷰티케어 ${PLANS[tier].name} 플랜`,
    });

    // 3) 구독 생성
    const subscription = await Subscription.create({
      hospital_id: hospitalId,
      tier,
      price: amount,
      expires_at: expiresAt,
      billing_key: billingKey,
    });

    // 4) 결제 내역 저장
    await Payment.create({
      hospital_id: hospitalId,
      sub_id: subscription.sub_id,
      amount,
      status: 'SUCCESS',
      toss_payment_key: paymentData.paymentKey,
      billing_key: billingKey,
      paid_at: new Date(),
    });

    // 5) 병원 구독 등급 업데이트
    await pool.query(
      'UPDATE hospitals SET subscription_tier = $1 WHERE hospital_id = $2',
      [tier, hospitalId]
    );

    return successResponse(res, {
      subscription,
      payment_key: paymentData.paymentKey,
    }, '구독이 활성화되었습니다', 201);
  } catch (error) {
    next(error);
  }
};

// ─── 5. 구독 취소 ───────────────────────────────────────

/**
 * POST /api/subscriptions/cancel
 *
 * 인증 필수 (병원 소유자)
 * 요청 body: { reason: '취소 사유' }
 *
 * - 현재 구독 기간 만료일까지는 서비스 유지
 * - 토스페이먼츠 정기결제 해지 API 호출
 * - auto_renew = false로 변경
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const { reason } = req.body;

    // 병원 소유자 확인
    const hospital = await Hospital.findByOwnerId(req.user.id);
    if (!hospital) {
      return errorResponse(res, '등록된 병원이 없습니다', 404);
    }

    // 활성 구독 확인
    const subscription = await Subscription.findActiveByHospitalId(hospital.hospital_id);
    if (!subscription) {
      return errorResponse(res, '활성 구독이 없습니다', 404);
    }

    // 무료 플랜은 취소 불필요
    if (subscription.tier === 'FREE') {
      return errorResponse(res, '무료 플랜은 취소할 수 없습니다', 400);
    }

    // 토스페이먼츠 빌링키가 있으면 정기결제 해지
    if (subscription.billing_key) {
      try {
        const credentials = Buffer.from(`${env.toss.secretKey}:`).toString('base64');
        await fetch(`${TOSS_API_BASE}/${subscription.billing_key}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (tossError) {
        // 토스 API 실패해도 내부 취소는 진행
        console.error('토스 정기결제 해지 실패:', tossError.message);
      }
    }

    // 구독 취소 처리 (만료일까지 서비스 유지)
    const cancelled = await Subscription.cancel(subscription.sub_id, reason || '사유 미입력');

    return successResponse(res, {
      subscription: cancelled,
      message_detail: `${cancelled.expires_at.toISOString().split('T')[0]}까지 서비스를 이용하실 수 있습니다`,
    }, '구독이 취소되었습니다. 현재 기간 만료까지 서비스가 유지됩니다');
  } catch (error) {
    next(error);
  }
};

module.exports = { getPlans, getMySubscription, checkout, confirmPayment, cancelSubscription, PLANS };
