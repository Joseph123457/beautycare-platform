/**
 * 구독 모델
 * 구독·결제 관련 데이터베이스 쿼리를 처리한다.
 */
const { pool } = require('../config/database');

const Subscription = {
  /**
   * 병원의 현재 활성 구독 조회
   * @param {number} hospitalId - 병원 ID
   */
  findActiveByHospitalId: async (hospitalId) => {
    const result = await pool.query(
      `SELECT * FROM subscriptions
       WHERE hospital_id = $1
         AND expires_at > NOW()
         AND cancelled_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [hospitalId]
    );
    return result.rows[0] || null;
  },

  /**
   * 구독 생성
   * @param {object} data - 구독 정보
   */
  create: async ({ hospital_id, tier, price, expires_at, billing_key }) => {
    const result = await pool.query(
      `INSERT INTO subscriptions (hospital_id, tier, price, expires_at, billing_key)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [hospital_id, tier, price, expires_at, billing_key]
    );
    return result.rows[0];
  },

  /**
   * 구독 취소 처리
   * @param {number} subId - 구독 ID
   * @param {string} reason - 취소 사유
   */
  cancel: async (subId, reason) => {
    const result = await pool.query(
      `UPDATE subscriptions
       SET auto_renew = false,
           cancel_reason = $2,
           cancelled_at = NOW()
       WHERE sub_id = $1
       RETURNING *`,
      [subId, reason]
    );
    return result.rows[0] || null;
  },

  /**
   * 구독 ID로 조회
   * @param {number} subId - 구독 ID
   */
  findById: async (subId) => {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE sub_id = $1',
      [subId]
    );
    return result.rows[0] || null;
  },

  /**
   * 병원의 구독 이력 조회 (페이지네이션)
   * @param {number} hospitalId - 병원 ID
   */
  findAllByHospitalId: async (hospitalId) => {
    const result = await pool.query(
      `SELECT * FROM subscriptions
       WHERE hospital_id = $1
       ORDER BY created_at DESC`,
      [hospitalId]
    );
    return result.rows;
  },
};

module.exports = Subscription;
