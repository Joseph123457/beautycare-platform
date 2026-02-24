/**
 * 사용자 모델
 * 사용자 관련 데이터베이스 쿼리를 처리한다.
 */
const { pool } = require('../config/database');

const User = {
  /**
   * 이메일로 사용자 조회
   * @param {string} email - 사용자 이메일
   */
  findByEmail: async (email) => {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * ID로 사용자 조회
   * @param {number} id - 사용자 ID (user_id)
   */
  findById: async (id) => {
    const result = await pool.query(
      'SELECT user_id, email, name, phone, created_at FROM users WHERE user_id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * 카카오 ID로 사용자 조회
   * @param {number} kakaoId - 카카오 회원번호
   */
  findByKakaoId: async (kakaoId) => {
    const result = await pool.query(
      'SELECT * FROM users WHERE kakao_id = $1',
      [kakaoId]
    );
    return result.rows[0] || null;
  },

  /**
   * 새 사용자 생성 (일반 회원가입)
   * @param {object} userData - { email, password, name, phone }
   */
  create: async ({ email, password, name, phone }) => {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, email, name, phone, created_at`,
      [email, password, name, phone]
    );
    return result.rows[0];
  },

  /**
   * 카카오 소셜 로그인 사용자 생성
   * @param {object} data - { kakaoId, email, name }
   */
  createFromKakao: async ({ kakaoId, email, name }) => {
    const result = await pool.query(
      `INSERT INTO users (kakao_id, email, name, password_hash)
       VALUES ($1, $2, $3, 'KAKAO_SOCIAL')
       RETURNING user_id, email, name, phone, kakao_id, created_at`,
      [kakaoId, email, name]
    );
    return result.rows[0];
  },

  /**
   * 리프레시 토큰 저장
   * @param {number} userId - 사용자 ID
   * @param {string} refreshToken - JWT 리프레시 토큰
   */
  saveRefreshToken: async (userId, refreshToken) => {
    await pool.query(
      'UPDATE users SET refresh_token = $1 WHERE user_id = $2',
      [refreshToken, userId]
    );
  },

  /**
   * 리프레시 토큰 조회 (토큰 갱신 시 DB에 저장된 값과 비교)
   * @param {number} userId - 사용자 ID
   */
  getRefreshToken: async (userId) => {
    const result = await pool.query(
      'SELECT refresh_token FROM users WHERE user_id = $1',
      [userId]
    );
    return result.rows[0]?.refresh_token || null;
  },

  /**
   * 리프레시 토큰 삭제 (로그아웃)
   * @param {number} userId - 사용자 ID
   */
  clearRefreshToken: async (userId) => {
    await pool.query(
      'UPDATE users SET refresh_token = NULL WHERE user_id = $1',
      [userId]
    );
  },

  /**
   * 푸시 토큰 업데이트
   * @param {number} userId - 사용자 ID
   * @param {string} pushToken - FCM/Expo 푸시 토큰
   */
  updatePushToken: async (userId, pushToken) => {
    await pool.query(
      'UPDATE users SET push_token = $1, updated_at = NOW() WHERE user_id = $2',
      [pushToken, userId]
    );
  },

  /**
   * 사용자 정보 수정
   * @param {number} id - 사용자 ID (user_id)
   * @param {object} updates - { name, phone }
   */
  update: async (id, { name, phone }) => {
    const result = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), updated_at = NOW()
       WHERE user_id = $3
       RETURNING user_id, email, name, phone, updated_at`,
      [name, phone, id]
    );
    return result.rows[0] || null;
  },
};

module.exports = User;
