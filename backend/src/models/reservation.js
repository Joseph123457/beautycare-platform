/**
 * 예약 모델
 * 예약 관련 데이터베이스 CRUD 쿼리를 처리한다.
 */
const { pool } = require('../config/database');

const Reservation = {
  /**
   * 사용자의 예약 목록 조회
   * @param {number} userId - 사용자 ID (user_id)
   * @param {number} limit - 한 페이지 항목 수
   * @param {number} offset - 건너뛸 항목 수
   */
  findByUserId: async (userId, limit = 20, offset = 0) => {
    const result = await pool.query(
      `SELECT r.reservation_id, r.treatment_name, r.reserved_at,
              r.status, r.memo, r.created_at,
              h.name AS hospital_name, h.address AS hospital_address
       FROM reservations r
       JOIN hospitals h ON r.hospital_id = h.hospital_id
       WHERE r.user_id = $1
       ORDER BY r.reserved_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  /**
   * ID로 예약 상세 조회
   * @param {number} id - 예약 ID (reservation_id)
   */
  findById: async (id) => {
    const result = await pool.query(
      `SELECT r.*, h.name AS hospital_name, h.address AS hospital_address,
              u.name AS user_name, u.phone AS user_phone
       FROM reservations r
       JOIN hospitals h ON r.hospital_id = h.hospital_id
       JOIN users u ON r.user_id = u.user_id
       WHERE r.reservation_id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * 새 예약 생성
   * @param {object} data - { user_id, hospital_id, treatment_name, reserved_at, memo }
   */
  create: async ({ user_id, hospital_id, treatment_name, reserved_at, memo }) => {
    const result = await pool.query(
      `INSERT INTO reservations (user_id, hospital_id, treatment_name, reserved_at, memo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, hospital_id, treatment_name, reserved_at, memo]
    );
    return result.rows[0];
  },

  /**
   * 예약 취소 (상태를 CANCELLED로 변경)
   * @param {number} id - 예약 ID (reservation_id)
   */
  cancel: async (id) => {
    const result = await pool.query(
      `UPDATE reservations
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE reservation_id = $1 AND status = 'PENDING'
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * 병원 ID로 예약 목록 조회 (병원 대시보드용)
   * @param {number} hospitalId - 병원 ID
   * @param {object} filters - { status, date } 선택적 필터
   */
  findByHospitalId: async (hospitalId, { status, date } = {}) => {
    const conditions = ['r.hospital_id = $1'];
    const params = [hospitalId];
    let idx = 2;

    // 상태 필터
    if (status) {
      conditions.push(`r.status = $${idx}`);
      params.push(status);
      idx++;
    }

    // 날짜 필터 (KST 기준 오늘)
    if (date === 'today') {
      conditions.push(
        `r.reserved_at >= (NOW() AT TIME ZONE 'Asia/Seoul')::date`
      );
      conditions.push(
        `r.reserved_at < ((NOW() AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '1 day')`
      );
    }

    const result = await pool.query(
      `SELECT r.reservation_id, r.treatment_name, r.reserved_at,
              r.status, r.memo, r.created_at, r.hospital_id,
              u.name AS user_name, u.phone AS user_phone
       FROM reservations r
       JOIN users u ON r.user_id = u.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.reserved_at DESC`,
      params
    );
    return result.rows;
  },

  /**
   * 예약 상태 변경 (상태 전이 규칙 적용)
   * - PENDING → CONFIRMED, CANCELLED
   * - CONFIRMED → DONE, CANCELLED
   * - DONE, CANCELLED → 변경 불가
   * @param {number} id - 예약 ID
   * @param {string} newStatus - 변경할 상태
   */
  updateStatus: async (id, newStatus) => {
    // 상태 전이 규칙: 허용되는 이전 상태 목록
    const allowedFrom = {
      CONFIRMED: ['PENDING'],
      DONE: ['CONFIRMED'],
      CANCELLED: ['PENDING', 'CONFIRMED'],
    };

    const fromStatuses = allowedFrom[newStatus];
    if (!fromStatuses) {
      return null; // 유효하지 않은 목표 상태
    }

    const placeholders = fromStatuses.map((_, i) => `$${i + 3}`).join(', ');

    const result = await pool.query(
      `UPDATE reservations
       SET status = $1, updated_at = NOW()
       WHERE reservation_id = $2 AND status IN (${placeholders})
       RETURNING *`,
      [newStatus, id, ...fromStatuses]
    );
    return result.rows[0] || null;
  },
};

module.exports = Reservation;
