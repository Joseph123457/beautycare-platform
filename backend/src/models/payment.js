/**
 * 결제 모델
 * 결제 내역 관련 데이터베이스 쿼리를 처리한다.
 */
const { pool } = require('../config/database');

const Payment = {
  /**
   * 결제 내역 생성
   * @param {object} data - 결제 정보
   */
  create: async ({ hospital_id, sub_id, amount, status, toss_payment_key, billing_key, paid_at }) => {
    const result = await pool.query(
      `INSERT INTO payments (hospital_id, sub_id, amount, status, toss_payment_key, billing_key, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [hospital_id, sub_id, amount, status, toss_payment_key, billing_key, paid_at]
    );
    return result.rows[0];
  },

  /**
   * 토스 결제키로 결제 내역 조회
   * @param {string} paymentKey - 토스페이먼츠 paymentKey
   */
  findByTossPaymentKey: async (paymentKey) => {
    const result = await pool.query(
      'SELECT * FROM payments WHERE toss_payment_key = $1',
      [paymentKey]
    );
    return result.rows[0] || null;
  },

  /**
   * 병원의 결제 내역 조회
   * @param {number} hospitalId - 병원 ID
   */
  findAllByHospitalId: async (hospitalId) => {
    const result = await pool.query(
      `SELECT p.*, s.tier, s.started_at, s.expires_at
       FROM payments p
       LEFT JOIN subscriptions s ON p.sub_id = s.sub_id
       WHERE p.hospital_id = $1
       ORDER BY p.created_at DESC`,
      [hospitalId]
    );
    return result.rows;
  },

  /**
   * 결제 상태 업데이트
   * @param {number} paymentId - 결제 ID
   * @param {string} status - 결제 상태 (SUCCESS|FAIL|CANCEL)
   */
  updateStatus: async (paymentId, status) => {
    const result = await pool.query(
      `UPDATE payments SET status = $2 WHERE payment_id = $1 RETURNING *`,
      [paymentId, status]
    );
    return result.rows[0] || null;
  },
};

module.exports = Payment;
