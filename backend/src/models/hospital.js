/**
 * 병원 모델
 * 병원 관련 데이터베이스 CRUD 쿼리를 처리한다.
 */
const { pool } = require('../config/database');

const Hospital = {
  /**
   * 병원 목록 조회 (페이지네이션)
   * @param {number} limit - 한 페이지 항목 수
   * @param {number} offset - 건너뛸 항목 수
   */
  findAll: async (limit = 20, offset = 0) => {
    const result = await pool.query(
      `SELECT hospital_id, name, address, category, lat, lng,
              avg_rating, review_count, created_at,
              foreign_friendly, languages_supported, has_interpreter,
              accepts_foreign_insurance, foreign_patient_ratio
       FROM hospitals
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  },

  /**
   * ID로 병원 상세 조회
   * @param {number} id - 병원 ID (hospital_id)
   */
  findById: async (id) => {
    const result = await pool.query(
      'SELECT * FROM hospitals WHERE hospital_id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * 새 병원 등록
   * @param {object} data - 병원 정보
   */
  create: async ({ name, address, category, description, lat, lng, owner_user_id }) => {
    const result = await pool.query(
      `INSERT INTO hospitals (name, address, category, description, lat, lng, owner_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, address, category, description, lat, lng, owner_user_id]
    );
    return result.rows[0];
  },

  /**
   * 병원 정보 수정
   * @param {number} id - 병원 ID (hospital_id)
   * @param {object} data - 수정할 정보
   */
  update: async (id, { name, address, category, description,
    foreign_friendly, languages_supported, has_interpreter,
    accepts_foreign_insurance, foreign_patient_ratio }) => {
    const result = await pool.query(
      `UPDATE hospitals
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           category = COALESCE($3, category),
           description = COALESCE($4, description),
           foreign_friendly = COALESCE($5, foreign_friendly),
           languages_supported = COALESCE($6, languages_supported),
           has_interpreter = COALESCE($7, has_interpreter),
           accepts_foreign_insurance = COALESCE($8, accepts_foreign_insurance),
           foreign_patient_ratio = COALESCE($9, foreign_patient_ratio),
           updated_at = NOW()
       WHERE hospital_id = $10
       RETURNING *`,
      [name, address, category, description,
       foreign_friendly, languages_supported, has_interpreter,
       accepts_foreign_insurance, foreign_patient_ratio, id]
    );
    return result.rows[0] || null;
  },

  /**
   * 소유자 ID로 병원 조회
   * @param {number} userId - 소유자 사용자 ID (owner_user_id)
   */
  findByOwnerId: async (userId) => {
    const result = await pool.query(
      'SELECT * FROM hospitals WHERE owner_user_id = $1 LIMIT 1',
      [userId]
    );
    return result.rows[0] || null;
  },

  /**
   * 병원 삭제
   * @param {number} id - 병원 ID (hospital_id)
   */
  delete: async (id) => {
    const result = await pool.query(
      'DELETE FROM hospitals WHERE hospital_id = $1 RETURNING hospital_id',
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = Hospital;
