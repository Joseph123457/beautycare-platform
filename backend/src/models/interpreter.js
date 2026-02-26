/**
 * 통역사 모델
 * 통역사 및 통역 예약 관련 데이터베이스 쿼리를 처리한다.
 */
const { pool } = require('../config/database');

const Interpreter = {
  /**
   * 가용 통역사 목록 조회
   * @param {object} filters - { language, type, date }
   * @returns {Array} 조건에 맞는 통역사 목록
   */
  findAvailable: async ({ language, type, date } = {}) => {
    const conditions = ['i.is_available = true'];
    const params = [];
    let idx = 1;

    // 언어 필터 (JSONB 포함 검사)
    if (language) {
      conditions.push(`i.languages @> $${idx}::jsonb`);
      params.push(JSON.stringify([language]));
      idx++;
    }

    // 통역 유형 필터 (PHONE/VISIT 요청 시 해당 유형 또는 BOTH)
    if (type) {
      conditions.push(`(i.available_type = $${idx} OR i.available_type = 'BOTH')`);
      params.push(type);
      idx++;
    }

    // 날짜 필터 — 해당 날짜에 이미 확정된 예약이 있는 통역사 제외
    if (date) {
      conditions.push(`
        NOT EXISTS (
          SELECT 1 FROM interpretation_bookings ib
          WHERE ib.interpreter_id = i.interpreter_id
            AND ib.status IN ('PENDING', 'CONFIRMED')
            AND DATE(ib.scheduled_at) = $${idx}::date
        )
      `);
      params.push(date);
      idx++;
    }

    const result = await pool.query(
      `SELECT i.interpreter_id, i.name, i.languages, i.available_type,
              i.hourly_rate, i.rating, i.review_count
       FROM interpreters i
       WHERE ${conditions.join(' AND ')}
       ORDER BY i.rating DESC, i.review_count DESC`,
      params
    );
    return result.rows;
  },

  /**
   * ID로 통역사 조회
   * @param {number} id - 통역사 ID
   */
  findById: async (id) => {
    const result = await pool.query(
      `SELECT * FROM interpreters WHERE interpreter_id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * 통역사 등록 (관리자)
   * @param {object} data - 통역사 정보
   */
  create: async ({ name, phone, email, languages, available_type, hourly_rate }) => {
    const result = await pool.query(
      `INSERT INTO interpreters (name, phone, email, languages, available_type, hourly_rate)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, phone, email, JSON.stringify(languages), available_type, hourly_rate]
    );
    return result.rows[0];
  },

  /**
   * 통역사 평점 갱신
   * 리뷰가 추가될 때 평균 평점과 리뷰 수를 재계산한다.
   * @param {number} interpreterId - 통역사 ID
   */
  updateRating: async (interpreterId) => {
    const result = await pool.query(
      `UPDATE interpreters
       SET rating = COALESCE((
             SELECT ROUND(AVG(ib.rating), 2)
             FROM interpretation_bookings ib
             WHERE ib.interpreter_id = $1 AND ib.rating IS NOT NULL
           ), 0),
           review_count = (
             SELECT COUNT(*)
             FROM interpretation_bookings ib
             WHERE ib.interpreter_id = $1 AND ib.rating IS NOT NULL
           )
       WHERE interpreter_id = $1
       RETURNING *`,
      [interpreterId]
    );
    return result.rows[0] || null;
  },
};

/* ── 통역 예약 모델 ────────────────────────────────────── */

const InterpretationBooking = {
  /**
   * 통역 예약 생성
   * @param {object} data - 예약 정보
   */
  create: async ({ reservation_id, interpreter_id, user_id, type, scheduled_at, duration_hours, total_fee }) => {
    const result = await pool.query(
      `INSERT INTO interpretation_bookings
         (reservation_id, interpreter_id, user_id, type, scheduled_at, duration_hours, total_fee)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [reservation_id, interpreter_id, user_id, type, scheduled_at, duration_hours, total_fee]
    );
    return result.rows[0];
  },

  /**
   * ID로 통역 예약 조회
   * @param {number} id - 예약 ID
   */
  findById: async (id) => {
    const result = await pool.query(
      `SELECT ib.*, i.name AS interpreter_name, i.phone AS interpreter_phone,
              i.languages AS interpreter_languages
       FROM interpretation_bookings ib
       JOIN interpreters i ON ib.interpreter_id = i.interpreter_id
       WHERE ib.booking_id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * 사용자의 통역 예약 목록 조회
   * @param {number} userId - 사용자 ID
   */
  findByUserId: async (userId) => {
    const result = await pool.query(
      `SELECT ib.booking_id, ib.reservation_id, ib.type, ib.scheduled_at,
              ib.duration_hours, ib.total_fee, ib.status,
              ib.rating, ib.review_content,
              i.name AS interpreter_name, i.languages AS interpreter_languages,
              r.treatment_name, h.name AS hospital_name
       FROM interpretation_bookings ib
       JOIN interpreters i ON ib.interpreter_id = i.interpreter_id
       JOIN reservations r ON ib.reservation_id = r.reservation_id
       JOIN hospitals h ON r.hospital_id = h.hospital_id
       WHERE ib.user_id = $1
       ORDER BY ib.scheduled_at DESC`,
      [userId]
    );
    return result.rows;
  },

  /**
   * 통역 예약 상태 변경
   * @param {number} bookingId - 예약 ID
   * @param {string} status - 변경할 상태
   */
  updateStatus: async (bookingId, status) => {
    const result = await pool.query(
      `UPDATE interpretation_bookings
       SET status = $1
       WHERE booking_id = $2
       RETURNING *`,
      [status, bookingId]
    );
    return result.rows[0] || null;
  },

  /**
   * 통역사 리뷰 등록
   * @param {number} bookingId - 예약 ID
   * @param {number} rating - 평점 (1~5)
   * @param {string} content - 리뷰 내용
   */
  addReview: async (bookingId, rating, content) => {
    const result = await pool.query(
      `UPDATE interpretation_bookings
       SET rating = $1, review_content = $2
       WHERE booking_id = $3
       RETURNING *`,
      [rating, content, bookingId]
    );
    return result.rows[0] || null;
  },
};

module.exports = { Interpreter, InterpretationBooking };
