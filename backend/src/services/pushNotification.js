/**
 * 푸시 알림 서비스
 * Firebase Cloud Messaging(FCM)을 사용해 모바일 푸시 알림을 발송한다.
 *
 * 발송 시나리오:
 *   [환자] 예약 확정 / 취소 / 리마인더 / 리뷰 요청
 *   [병원] 새 예약 / 새 리뷰 / 미답변 채팅
 *
 * 스케줄 작업 (node-cron):
 *   - 매일 09:00  → 당일 예약 리마인더
 *   - 매시간 정각 → 24시간 초과 미답변 채팅 알림
 *   - 매시간 정각 → 시술 완료 24시간 후 리뷰 요청
 */
const admin = require('firebase-admin');
const { pool } = require('../config/database');

/* ── Firebase 초기화 ──────────────────────────────────── */

let firebaseInitialized = false;

/**
 * Firebase Admin SDK 초기화
 * FIREBASE_SERVICE_ACCOUNT_KEY 환경변수에서 서비스 계정 JSON을 파싱한다.
 */
function initFirebase() {
  if (firebaseInitialized) return;

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.warn('[PUSH] FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다. 푸시 알림 비활성화.');
    return;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('[PUSH] Firebase Admin SDK 초기화 완료');
  } catch (error) {
    console.error('[PUSH] Firebase 초기화 실패:', error.message);
  }
}

/* ── 핵심 발송 함수 ──────────────────────────────────── */

/**
 * 단일 사용자에게 푸시 알림 발송
 * @param {number} userId - 수신자 user_id
 * @param {string} type - 알림 유형 (push_logs.type)
 * @param {string} title - 알림 제목
 * @param {string} body - 알림 본문
 * @param {object} data - 추가 페이로드 (딥링크 등)
 * @returns {boolean} 발송 성공 여부
 */
async function sendPush(userId, type, title, body, data = {}) {
  try {
    // 사용자의 푸시 토큰 조회
    const { rows } = await pool.query(
      'SELECT push_token FROM users WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    const pushToken = rows[0]?.push_token;
    if (!pushToken) {
      // 토큰 없으면 로그만 남기고 종료
      await savePushLog(userId, type, title, body, data, 'FAILED', '푸시 토큰 없음');
      return false;
    }

    // Firebase 미초기화 시 로그만 저장
    if (!firebaseInitialized) {
      await savePushLog(userId, type, title, body, data, 'FAILED', 'Firebase 미초기화');
      return false;
    }

    // FCM 메시지 구성
    const message = {
      token: pushToken,
      notification: { title, body },
      data: {
        type,
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
      },
      // Android 설정
      android: {
        priority: 'high',
        notification: {
          channelId: 'beautycare_default',
          sound: 'default',
        },
      },
      // iOS 설정
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // FCM 발송
    await admin.messaging().send(message);
    await savePushLog(userId, type, title, body, data, 'SENT');
    return true;
  } catch (error) {
    const errorMsg = error.message || '알 수 없는 오류';

    // 토큰 만료 / 무효 → push_token null 처리
    if (
      error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/invalid-registration-token'
    ) {
      await pool.query(
        'UPDATE users SET push_token = NULL, updated_at = NOW() WHERE user_id = $1',
        [userId]
      );
      console.warn(`[PUSH] 만료된 토큰 제거: user_id=${userId}`);
    }

    await savePushLog(userId, type, title, body, data, 'FAILED', errorMsg);
    console.error(`[PUSH] 발송 실패 (user=${userId}, type=${type}):`, errorMsg);
    return false;
  }
}

/**
 * 여러 사용자에게 동일한 알림 일괄 발송
 * @param {number[]} userIds - 수신자 목록
 * @param {string} type - 알림 유형
 * @param {string} title - 알림 제목
 * @param {string} body - 알림 본문
 * @param {object} data - 추가 페이로드
 * @returns {{ success: number, failed: number }}
 */
async function sendPushBulk(userIds, type, title, body, data = {}) {
  let success = 0;
  let failed = 0;

  for (const userId of userIds) {
    const ok = await sendPush(userId, type, title, body, data);
    if (ok) success++;
    else failed++;
  }

  return { success, failed };
}

/**
 * 발송 이력 저장
 * @param {string} channel - 발송 채널 (FCM, ALIMTALK, SMS)
 */
async function savePushLog(userId, type, title, body, data, status, errorMessage = null, channel = 'FCM') {
  try {
    await pool.query(
      `INSERT INTO push_logs (user_id, type, title, body, data, status, error_message, channel)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, type, title, body, JSON.stringify(data), status, errorMessage, channel]
    );
  } catch (err) {
    console.error('[PUSH] 로그 저장 실패:', err.message);
  }
}

/* ── 시나리오별 발송 함수 ────────────────────────────── */

// ─── 1. 환자 알림 ────────────────────────────────────

/**
 * 예약 확정 알림
 * @param {number} userId - 환자 ID
 * @param {string} hospitalName - 병원명
 * @param {string} reservedAt - 예약 일시 (ISO)
 * @param {number} reservationId - 예약 ID
 */
async function notifyReservationConfirmed(userId, hospitalName, reservedAt, reservationId) {
  const dt = new Date(reservedAt);
  const dateStr = `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

  return sendPush(
    userId,
    'RESERVATION_CONFIRMED',
    '예약 확정',
    `${hospitalName} 예약이 확정되었습니다. 예약일: ${dateStr}`,
    { reservationId, screen: 'ReservationDetail' }
  );
}

/**
 * 예약 취소 알림
 * @param {number} userId - 환자 ID
 * @param {string} reason - 취소 사유
 * @param {number} reservationId - 예약 ID
 */
async function notifyReservationCancelled(userId, reason, reservationId) {
  return sendPush(
    userId,
    'RESERVATION_CANCELLED',
    '예약 취소',
    `예약이 취소되었습니다. ${reason || ''}`.trim(),
    { reservationId, screen: 'ReservationDetail' }
  );
}

/**
 * 예약 1일 전 리마인더
 * @param {number} userId - 환자 ID
 * @param {string} hospitalName - 병원명
 * @param {number} reservationId - 예약 ID
 */
async function notifyReservationReminder(userId, hospitalName, reservationId) {
  return sendPush(
    userId,
    'RESERVATION_REMINDER',
    '예약 리마인더',
    `내일 ${hospitalName} 예약이 있습니다`,
    { reservationId, screen: 'ReservationDetail' }
  );
}

/**
 * 시술 완료 후 리뷰 요청
 * @param {number} userId - 환자 ID
 * @param {string} hospitalName - 병원명
 * @param {number} hospitalId - 병원 ID
 */
async function notifyReviewRequest(userId, hospitalName, hospitalId) {
  return sendPush(
    userId,
    'REVIEW_REQUEST',
    '리뷰를 남겨주세요',
    `${hospitalName} 방문 어떠셨나요? 솔직한 후기를 남겨주세요`,
    { hospitalId, screen: 'WriteReview' }
  );
}

// ─── 2. 병원 알림 ────────────────────────────────────

/**
 * 새 예약 접수 알림 (병원 소속 직원 전체에게)
 * @param {number} hospitalId - 병원 ID
 * @param {string} patientName - 환자명
 * @param {string} treatmentName - 시술명
 */
async function notifyNewReservation(hospitalId, patientName, treatmentName) {
  const staffIds = await getHospitalStaffIds(hospitalId);

  return sendPushBulk(
    staffIds,
    'NEW_RESERVATION',
    '새 예약 접수',
    `새 예약이 접수되었습니다. ${patientName} / ${treatmentName}`,
    { hospitalId, screen: 'DashboardReservations' }
  );
}

/**
 * 새 리뷰 등록 알림
 * @param {number} hospitalId - 병원 ID
 */
async function notifyNewReview(hospitalId) {
  const staffIds = await getHospitalStaffIds(hospitalId);

  return sendPushBulk(
    staffIds,
    'NEW_REVIEW',
    '새 리뷰 등록',
    '새 리뷰가 등록되었습니다. 확인 후 답변해주세요',
    { hospitalId, screen: 'DashboardReviews' }
  );
}

/**
 * 미답변 채팅 알림 (24시간 초과)
 * @param {number} hospitalId - 병원 ID
 * @param {number} unansweredCount - 미답변 건수
 */
async function notifyUnansweredChat(hospitalId, unansweredCount) {
  const staffIds = await getHospitalStaffIds(hospitalId);

  return sendPushBulk(
    staffIds,
    'UNANSWERED_CHAT',
    '미답변 문의',
    `24시간 이상 미답변 채팅이 ${unansweredCount}건 있습니다`,
    { hospitalId, screen: 'DashboardChats' }
  );
}

/**
 * 병원 소속 직원 user_id 목록 조회
 * @param {number} hospitalId - 병원 ID
 * @returns {number[]}
 */
async function getHospitalStaffIds(hospitalId) {
  const { rows } = await pool.query(
    `SELECT user_id FROM users
     WHERE hospital_id = $1 AND is_active = true AND push_token IS NOT NULL`,
    [hospitalId]
  );
  return rows.map((r) => r.user_id);
}

/* ── 스케줄 작업 ─────────────────────────────────────── */

/**
 * 매일 오전 9시: 내일 예약 리마인더 발송
 * 내일 날짜에 CONFIRMED 상태인 예약을 찾아 환자에게 알림
 */
async function scheduledReservationReminder() {
  console.log('[PUSH:CRON] 예약 리마인더 발송 시작');
  try {
    // KST 기준 내일 날짜 범위 계산
    const { rows } = await pool.query(
      `SELECT r.reservation_id, r.user_id, r.reserved_at,
              h.name AS hospital_name
       FROM reservations r
       JOIN hospitals h ON r.hospital_id = h.hospital_id
       WHERE r.status = 'CONFIRMED'
         AND r.reserved_at >= (NOW() AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '1 day'
         AND r.reserved_at <  (NOW() AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '2 days'`
    );

    let sent = 0;
    for (const r of rows) {
      const ok = await notifyReservationReminder(r.user_id, r.hospital_name, r.reservation_id);
      if (ok) sent++;
    }

    console.log(`[PUSH:CRON] 예약 리마인더 완료: ${sent}/${rows.length}건 발송`);
  } catch (error) {
    console.error('[PUSH:CRON] 예약 리마인더 실패:', error.message);
  }
}

/**
 * 매시간: 시술 완료(DONE) 24시간 후 리뷰 요청 발송
 * DONE으로 전환된 지 24~25시간 된 예약을 찾아 리뷰 요청
 * (이미 발송된 건은 push_logs로 중복 방지)
 */
async function scheduledReviewRequest() {
  console.log('[PUSH:CRON] 리뷰 요청 발송 시작');
  try {
    const { rows } = await pool.query(
      `SELECT r.reservation_id, r.user_id, r.hospital_id,
              h.name AS hospital_name
       FROM reservations r
       JOIN hospitals h ON r.hospital_id = h.hospital_id
       WHERE r.status = 'DONE'
         AND r.updated_at >= NOW() - INTERVAL '25 hours'
         AND r.updated_at <  NOW() - INTERVAL '24 hours'
         AND NOT EXISTS (
           SELECT 1 FROM push_logs pl
           WHERE pl.user_id = r.user_id
             AND pl.type = 'REVIEW_REQUEST'
             AND pl.data->>'reservationId' = r.reservation_id::text
         )`
    );

    let sent = 0;
    for (const r of rows) {
      const ok = await notifyReviewRequest(r.user_id, r.hospital_name, r.hospital_id);
      if (ok) sent++;
    }

    console.log(`[PUSH:CRON] 리뷰 요청 완료: ${sent}/${rows.length}건 발송`);
  } catch (error) {
    console.error('[PUSH:CRON] 리뷰 요청 실패:', error.message);
  }
}

/**
 * 매시간: 24시간 초과 미답변 채팅 체크
 * 환자가 보낸 마지막 메시지에 병원이 24시간 이상 미응답인 경우 알림
 * (같은 채팅방에 대해 하루 1회만 발송)
 */
async function scheduledUnansweredChatCheck() {
  console.log('[PUSH:CRON] 미답변 채팅 체크 시작');
  try {
    // 병원별 미답변 채팅방 수 집계
    const { rows } = await pool.query(
      `SELECT cr.hospital_id, COUNT(*) AS unanswered_count
       FROM chat_rooms cr
       WHERE cr.hospital_unread_count > 0
         AND cr.last_message_at < NOW() - INTERVAL '24 hours'
         AND NOT EXISTS (
           SELECT 1 FROM push_logs pl
           WHERE pl.type = 'UNANSWERED_CHAT'
             AND pl.data->>'hospitalId' = cr.hospital_id::text
             AND pl.created_at >= NOW() - INTERVAL '24 hours'
         )
       GROUP BY cr.hospital_id`
    );

    let sent = 0;
    for (const r of rows) {
      const result = await notifyUnansweredChat(r.hospital_id, Number(r.unanswered_count));
      sent += result.success;
    }

    console.log(`[PUSH:CRON] 미답변 채팅 알림 완료: ${sent}건 발송`);
  } catch (error) {
    console.error('[PUSH:CRON] 미답변 채팅 체크 실패:', error.message);
  }
}

/* ── 모듈 내보내기 ───────────────────────────────────── */

module.exports = {
  // 초기화
  initFirebase,

  // 핵심 함수
  sendPush,
  sendPushBulk,
  savePushLog,

  // 환자 알림
  notifyReservationConfirmed,
  notifyReservationCancelled,
  notifyReservationReminder,
  notifyReviewRequest,

  // 병원 알림
  notifyNewReservation,
  notifyNewReview,
  notifyUnansweredChat,

  // 스케줄 작업
  scheduledReservationReminder,
  scheduledReviewRequest,
  scheduledUnansweredChatCheck,
};
