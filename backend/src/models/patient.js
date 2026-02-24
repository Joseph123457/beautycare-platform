/**
 * 환자 CRM 모델
 * 병원 대시보드에서 사용하는 환자 관리 쿼리를 처리한다.
 */
const { pool } = require('../config/database');

const Patient = {
  /**
   * 환자 목록 조회 (예약 완료 환자 집계)
   * @param {number} hospitalId - 병원 ID
   * @param {object} opts - { search, sort, page, limit }
   */
  getPatients: async (hospitalId, { search, sort = 'last_visit', page = 1, limit = 20 } = {}) => {
    const conditions = [
      'r.hospital_id = $1',
      "r.status IN ('CONFIRMED', 'DONE')",
    ];
    const params = [hospitalId];
    let idx = 2;

    // 이름 또는 전화번호 검색
    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.phone ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    // 정렬 기준
    const orderBy = sort === 'visit_count'
      ? 'visit_count DESC'
      : 'last_visit DESC';

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT u.user_id, u.name, u.phone, u.email,
              COUNT(r.reservation_id) AS visit_count,
              MAX(r.reserved_at) AS last_visit,
              COALESCE(SUM(r.price), 0) AS total_spent
       FROM reservations r
       JOIN users u ON r.user_id = u.user_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY u.user_id, u.name, u.phone, u.email
       ORDER BY ${orderBy}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );
    return result.rows;
  },

  /**
   * 환자 총 수 (페이지네이션용)
   * @param {number} hospitalId - 병원 ID
   * @param {string} search - 검색어
   */
  countPatients: async (hospitalId, search) => {
    const conditions = [
      'r.hospital_id = $1',
      "r.status IN ('CONFIRMED', 'DONE')",
    ];
    const params = [hospitalId];
    let idx = 2;

    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.phone ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const result = await pool.query(
      `SELECT COUNT(DISTINCT u.user_id) AS total
       FROM reservations r
       JOIN users u ON r.user_id = u.user_id
       WHERE ${conditions.join(' AND ')}`,
      params
    );
    return Number(result.rows[0].total);
  },

  /**
   * 환자 상세 정보 조회
   * 기본 정보 + 방문 집계 + 시술 이력 + 리뷰 + 재방문 주기 + 메모
   * @param {number} hospitalId - 병원 ID
   * @param {number} userId - 환자 user_id
   */
  getPatientDetail: async (hospitalId, userId) => {
    // 1) 기본 정보 + 방문 집계
    const summaryResult = await pool.query(
      `SELECT u.user_id, u.name, u.phone, u.email,
              COUNT(r.reservation_id) AS visit_count,
              MAX(r.reserved_at) AS last_visit,
              COALESCE(SUM(r.price), 0) AS total_spent
       FROM users u
       LEFT JOIN reservations r
         ON r.user_id = u.user_id
         AND r.hospital_id = $1
         AND r.status IN ('CONFIRMED', 'DONE')
       WHERE u.user_id = $2
       GROUP BY u.user_id, u.name, u.phone, u.email`,
      [hospitalId, userId]
    );
    const summary = summaryResult.rows[0] || null;
    if (!summary) return null;

    // 2) 시술 이력
    const reservationsResult = await pool.query(
      `SELECT reservation_id, treatment_name, reserved_at, status, price, memo
       FROM reservations
       WHERE hospital_id = $1 AND user_id = $2
       ORDER BY reserved_at DESC`,
      [hospitalId, userId]
    );

    // 3) 리뷰 목록
    const reviewsResult = await pool.query(
      `SELECT review_id, rating, content, created_at
       FROM reviews
       WHERE hospital_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [hospitalId, userId]
    );

    // 4) 재방문 주기 (방문일 사이 평균 간격)
    const intervalResult = await pool.query(
      `SELECT AVG(gap) AS avg_days
       FROM (
         SELECT reserved_at - LAG(reserved_at) OVER (ORDER BY reserved_at) AS gap
         FROM reservations
         WHERE hospital_id = $1 AND user_id = $2
           AND status IN ('CONFIRMED', 'DONE')
       ) sub
       WHERE gap IS NOT NULL`,
      [hospitalId, userId]
    );
    const avgRevisitDays = intervalResult.rows[0]?.avg_days
      ? Math.round(Number(intervalResult.rows[0].avg_days) / (24 * 60 * 60 * 1000000)) // interval → 일
      : null;

    // 5) 메모 목록
    const memosResult = await pool.query(
      `SELECT memo_id, content, created_by, created_at
       FROM patient_memos
       WHERE hospital_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [hospitalId, userId]
    );

    return {
      ...summary,
      reservations: reservationsResult.rows,
      reviews: reviewsResult.rows,
      avg_revisit_days: avgRevisitDays,
      memos: memosResult.rows,
    };
  },

  /**
   * 환자 메모 저장
   * @param {number} hospitalId - 병원 ID
   * @param {number} userId - 환자 user_id
   * @param {string} content - 메모 내용
   * @param {string} createdBy - 작성자 이름
   */
  addMemo: async (hospitalId, userId, content, createdBy) => {
    const result = await pool.query(
      `INSERT INTO patient_memos (hospital_id, user_id, content, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [hospitalId, userId, content, createdBy]
    );
    return result.rows[0];
  },

  /**
   * 단체 메시지 대상 조회
   * @param {number} hospitalId - 병원 ID
   * @param {object} opts - { target, treatmentName, inactiveMonths }
   * @returns {Array<{ user_id, name, phone, push_token }>}
   */
  getBulkTargets: async (hospitalId, { target, treatmentName, inactiveMonths } = {}) => {
    const conditions = [
      'r.hospital_id = $1',
      "r.status IN ('CONFIRMED', 'DONE')",
    ];
    const params = [hospitalId];
    let idx = 2;

    // 특정 시술명 환자
    if (target === 'treatment' && treatmentName) {
      conditions.push(`r.treatment_name ILIKE $${idx}`);
      params.push(`%${treatmentName}%`);
      idx++;
    }

    // N개월 이상 미방문 환자
    let havingClause = '';
    if (target === 'inactive' && inactiveMonths) {
      havingClause = `HAVING MAX(r.reserved_at) < NOW() - INTERVAL '${Number(inactiveMonths)} months'`;
    }

    const result = await pool.query(
      `SELECT u.user_id, u.name, u.phone, u.push_token
       FROM reservations r
       JOIN users u ON r.user_id = u.user_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY u.user_id, u.name, u.phone, u.push_token
       ${havingClause}`,
      params
    );
    return result.rows;
  },
};

module.exports = Patient;
