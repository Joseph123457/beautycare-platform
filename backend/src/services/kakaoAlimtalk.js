/**
 * 카카오 알림톡 서비스
 * 카카오 비즈메시지 API를 사용해 알림톡을 발송한다.
 * 알림톡 발송 실패 시 일반 SMS로 폴백 처리.
 *
 * 발송 시나리오:
 *   - 예약 확정 알림톡
 *   - 리뷰 요청 알림톡
 *
 * 환경변수:
 *   KAKAO_BIZ_API_KEY  — 카카오 비즈메시지 API 키
 *   KAKAO_SENDER_KEY   — 발신 프로필 키
 */
const axios = require('axios');
const { pool } = require('../config/database');
const env = require('../config/env');
const { savePushLog } = require('./pushNotification');

/* ── 상수 ─────────────────────────────────────────────── */

// 카카오 비즈메시지 API 엔드포인트
const KAKAO_BIZ_API_URL = 'https://bizapi.kakao.com/v2/sender';

// 알림톡 템플릿 코드 (카카오 비즈니스 콘솔에서 등록 후 코드 입력)
const TEMPLATE_CODES = {
  RESERVATION_CONFIRMED: process.env.KAKAO_TPL_RESERVATION_CONFIRMED || 'TPL_RESV_CONFIRM',
  REVIEW_REQUEST: process.env.KAKAO_TPL_REVIEW_REQUEST || 'TPL_REVIEW_REQ',
};

// 앱 딥링크 기본 URL
const APP_DEEPLINK_BASE = process.env.APP_DEEPLINK_BASE || 'beautycare://';

/* ── 초기화 상태 ──────────────────────────────────────── */

let kakaoInitialized = false;

/**
 * 카카오 비즈메시지 초기화 확인
 * API 키와 발신자 키가 설정되어 있는지 검증
 */
function initKakaoAlimtalk() {
  if (kakaoInitialized) return;

  if (!env.kakaoBiz.apiKey || !env.kakaoBiz.senderKey) {
    console.warn('[ALIMTALK] KAKAO_BIZ_API_KEY 또는 KAKAO_SENDER_KEY가 설정되지 않았습니다. 알림톡 비활성화.');
    return;
  }

  kakaoInitialized = true;
  console.log('[ALIMTALK] 카카오 알림톡 초기화 완료');
}

/* ── HTTP 클라이언트 ──────────────────────────────────── */

/**
 * 카카오 비즈메시지 API용 axios 인스턴스 생성
 */
function getKakaoClient() {
  return axios.create({
    baseURL: KAKAO_BIZ_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.kakaoBiz.apiKey}`,
    },
    timeout: 10000,
  });
}

/* ── 핵심 발송 함수 ──────────────────────────────────── */

/**
 * 알림톡 발송 (실패 시 SMS 폴백)
 * @param {number} userId - 수신자 user_id
 * @param {string} phone - 수신자 전화번호
 * @param {string} type - 알림 유형 (push_logs.type)
 * @param {string} templateCode - 카카오 알림톡 템플릿 코드
 * @param {object} templateVars - 템플릿 치환 변수
 * @param {string} fallbackText - SMS 폴백 메시지 텍스트
 * @param {object} buttons - 알림톡 버튼 배열 (선택)
 * @param {object} data - push_logs에 저장할 추가 데이터
 * @returns {{ channel: string, success: boolean }}
 */
async function sendAlimtalk(userId, phone, type, templateCode, templateVars, fallbackText, buttons = [], data = {}) {
  // 알림톡 먼저 시도
  const alimtalkResult = await attemptAlimtalk(userId, phone, type, templateCode, templateVars, buttons, data);

  if (alimtalkResult.success) {
    return { channel: 'ALIMTALK', success: true };
  }

  // 알림톡 실패 → SMS 폴백
  console.warn(`[ALIMTALK] 알림톡 실패, SMS 폴백 시도 (user=${userId})`);
  const smsResult = await attemptSms(userId, phone, type, fallbackText, data);

  return { channel: smsResult.success ? 'SMS' : 'FAILED', success: smsResult.success };
}

/**
 * 알림톡 발송 시도
 */
async function attemptAlimtalk(userId, phone, type, templateCode, templateVars, buttons, data) {
  try {
    // 미초기화 시 실패 반환
    if (!kakaoInitialized) {
      await savePushLog(userId, type, '알림톡', JSON.stringify(templateVars), data, 'FAILED', '카카오 미초기화', 'ALIMTALK');
      return { success: false };
    }

    const client = getKakaoClient();

    // 카카오 비즈메시지 API 요청 본문
    const requestBody = {
      senderKey: env.kakaoBiz.senderKey,
      templateCode,
      recipientList: [
        {
          recipientNo: formatPhoneNumber(phone),
          templateParameter: templateVars,
          ...(buttons.length > 0 && { buttons }),
        },
      ],
    };

    const response = await client.post('/send', requestBody);

    // 응답 검증
    const result = response.data;
    const recipient = result?.recipientList?.[0];

    if (recipient?.resultCode === '0000' || result?.resultCode === '0000') {
      // 발송 성공
      await savePushLog(
        userId, type, '알림톡',
        JSON.stringify(templateVars),
        { ...data, messageId: recipient?.messageId },
        'SENT', null, 'ALIMTALK'
      );
      return { success: true };
    }

    // API 응답은 왔지만 발송 실패
    const errorMsg = recipient?.resultMessage || result?.resultMessage || '알림톡 발송 실패';
    await savePushLog(userId, type, '알림톡', JSON.stringify(templateVars), data, 'FAILED', errorMsg, 'ALIMTALK');
    return { success: false };
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || '알림톡 API 호출 실패';
    await savePushLog(userId, type, '알림톡', JSON.stringify(templateVars), data, 'FAILED', errorMsg, 'ALIMTALK');
    console.error(`[ALIMTALK] 발송 실패 (user=${userId}, type=${type}):`, errorMsg);
    return { success: false };
  }
}

/**
 * SMS 폴백 발송
 * 카카오 비즈메시지 API의 SMS 폴백 기능 사용
 */
async function attemptSms(userId, phone, type, text, data) {
  try {
    if (!kakaoInitialized) {
      await savePushLog(userId, type, 'SMS', text, data, 'FAILED', '카카오 미초기화', 'SMS');
      return { success: false };
    }

    const client = getKakaoClient();

    // SMS 발송 요청
    const requestBody = {
      senderKey: env.kakaoBiz.senderKey,
      recipientList: [
        {
          recipientNo: formatPhoneNumber(phone),
          content: text,
        },
      ],
    };

    const response = await client.post('/sms/send', requestBody);
    const result = response.data;
    const recipient = result?.recipientList?.[0];

    if (recipient?.resultCode === '0000' || result?.resultCode === '0000') {
      await savePushLog(userId, type, 'SMS', text, data, 'SENT', null, 'SMS');
      return { success: true };
    }

    const errorMsg = recipient?.resultMessage || result?.resultMessage || 'SMS 발송 실패';
    await savePushLog(userId, type, 'SMS', text, data, 'FAILED', errorMsg, 'SMS');
    return { success: false };
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || 'SMS API 호출 실패';
    await savePushLog(userId, type, 'SMS', text, data, 'FAILED', errorMsg, 'SMS');
    console.error(`[ALIMTALK:SMS] 폴백 실패 (user=${userId}, type=${type}):`, errorMsg);
    return { success: false };
  }
}

/* ── 전화번호 포맷 ───────────────────────────────────── */

/**
 * 전화번호를 카카오 API 형식으로 변환
 * 하이픈 제거, 국제번호 접두사 처리
 * @param {string} phone - 원본 전화번호
 * @returns {string} 정규화된 전화번호
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';
  // 하이픈, 공백, 괄호 제거
  let cleaned = phone.replace(/[\s\-()]/g, '');
  // +82 → 0 변환 (한국 국제번호)
  if (cleaned.startsWith('+82')) {
    cleaned = '0' + cleaned.slice(3);
  }
  return cleaned;
}

/* ── 날짜 포맷 헬퍼 ──────────────────────────────────── */

/**
 * ISO 날짜를 한국어 표시 형식으로 변환
 * @param {string} iso - ISO 날짜 문자열
 * @returns {{ dateStr: string, timeStr: string }}
 */
function formatDateTime(iso) {
  const d = new Date(iso);
  const dateStr = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { dateStr, timeStr };
}

/* ── 시나리오별 발송 함수 ────────────────────────────── */

/**
 * 예약 확정 알림톡
 * @param {number} userId - 환자 ID
 * @param {object} params - { hospitalName, reservedAt, treatmentName, hospitalAddress, reservationId }
 */
async function sendReservationConfirmedAlimtalk(userId, {
  hospitalName,
  reservedAt,
  treatmentName,
  hospitalAddress,
  reservationId,
}) {
  // 환자 전화번호 조회
  const { rows } = await pool.query(
    'SELECT phone, name FROM users WHERE user_id = $1',
    [userId]
  );
  const user = rows[0];
  if (!user?.phone) {
    console.warn(`[ALIMTALK] 전화번호 없음: user_id=${userId}`);
    return { channel: 'FAILED', success: false };
  }

  const { dateStr, timeStr } = formatDateTime(reservedAt);

  // 템플릿 치환 변수
  const templateVars = {
    patientName: user.name,
    hospitalName,
    date: dateStr,
    time: timeStr,
    treatmentName: treatmentName || '시술',
    hospitalAddress: hospitalAddress || '',
  };

  // SMS 폴백 텍스트
  const fallbackText =
    `[뷰티케어] ${hospitalName} 예약이 확정되었습니다.\n` +
    `예약일시: ${dateStr} ${timeStr}\n` +
    `시술: ${treatmentName || '시술'}`;

  // 알림톡 버튼 (앱으로 이동)
  const buttons = [
    {
      type: 'AL', // 앱 링크
      name: '예약 확인하기',
      schemeAndroid: `${APP_DEEPLINK_BASE}reservation/${reservationId}`,
      schemeIos: `${APP_DEEPLINK_BASE}reservation/${reservationId}`,
    },
  ];

  return sendAlimtalk(
    userId,
    user.phone,
    'RESERVATION_CONFIRMED',
    TEMPLATE_CODES.RESERVATION_CONFIRMED,
    templateVars,
    fallbackText,
    buttons,
    { reservationId }
  );
}

/**
 * 리뷰 요청 알림톡
 * @param {number} userId - 환자 ID
 * @param {object} params - { hospitalName, hospitalId }
 */
async function sendReviewRequestAlimtalk(userId, { hospitalName, hospitalId }) {
  // 환자 전화번호 조회
  const { rows } = await pool.query(
    'SELECT phone, name FROM users WHERE user_id = $1',
    [userId]
  );
  const user = rows[0];
  if (!user?.phone) {
    console.warn(`[ALIMTALK] 전화번호 없음: user_id=${userId}`);
    return { channel: 'FAILED', success: false };
  }

  // 리뷰 작성 딥링크
  const reviewDeeplink = `${APP_DEEPLINK_BASE}review/write?hospitalId=${hospitalId}`;

  // 템플릿 치환 변수
  const templateVars = {
    hospitalName,
    reviewLink: reviewDeeplink,
  };

  // SMS 폴백 텍스트
  const fallbackText =
    `[뷰티케어] ${hospitalName} 방문해 주셔서 감사합니다!\n` +
    `솔직한 후기를 남겨주세요.`;

  // 알림톡 버튼
  const buttons = [
    {
      type: 'AL',
      name: '리뷰 작성하기',
      schemeAndroid: reviewDeeplink,
      schemeIos: reviewDeeplink,
    },
  ];

  return sendAlimtalk(
    userId,
    user.phone,
    'REVIEW_REQUEST',
    TEMPLATE_CODES.REVIEW_REQUEST,
    templateVars,
    fallbackText,
    buttons,
    { hospitalId }
  );
}

/* ── 통합 발송 함수 (FCM + 알림톡 동시) ─────────────── */

/**
 * 예약 확정 시 FCM 푸시 + 알림톡 동시 발송
 * FCM과 알림톡을 병렬로 발송하여 도달률 극대화
 * @param {number} userId - 환자 ID
 * @param {object} params - 예약 관련 정보
 */
async function notifyReservationConfirmedAll(userId, params) {
  const { notifyReservationConfirmed } = require('./pushNotification');

  const results = await Promise.allSettled([
    // FCM 푸시
    notifyReservationConfirmed(userId, params.hospitalName, params.reservedAt, params.reservationId),
    // 카카오 알림톡
    sendReservationConfirmedAlimtalk(userId, params),
  ]);

  return {
    fcm: results[0].status === 'fulfilled' ? results[0].value : false,
    alimtalk: results[1].status === 'fulfilled' ? results[1].value : { channel: 'FAILED', success: false },
  };
}

/**
 * 리뷰 요청 시 FCM 푸시 + 알림톡 동시 발송
 * @param {number} userId - 환자 ID
 * @param {object} params - { hospitalName, hospitalId }
 */
async function notifyReviewRequestAll(userId, params) {
  const { notifyReviewRequest } = require('./pushNotification');

  const results = await Promise.allSettled([
    // FCM 푸시
    notifyReviewRequest(userId, params.hospitalName, params.hospitalId),
    // 카카오 알림톡
    sendReviewRequestAlimtalk(userId, params),
  ]);

  return {
    fcm: results[0].status === 'fulfilled' ? results[0].value : false,
    alimtalk: results[1].status === 'fulfilled' ? results[1].value : { channel: 'FAILED', success: false },
  };
}

/* ── 모듈 내보내기 ───────────────────────────────────── */

module.exports = {
  // 초기화
  initKakaoAlimtalk,

  // 핵심 함수
  sendAlimtalk,

  // 시나리오별 발송
  sendReservationConfirmedAlimtalk,
  sendReviewRequestAlimtalk,

  // 통합 발송 (FCM + 알림톡 동시)
  notifyReservationConfirmedAll,
  notifyReviewRequestAll,
};
