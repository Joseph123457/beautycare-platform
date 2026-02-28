/**
 * 즐겨찾기(좋아요) 모델
 * 사용자의 피드 콘텐츠 즐겨찾기 관련 쿼리를 처리한다.
 */
const { pool } = require('../config/database');

const Favorite = {
  /**
   * 즐겨찾기 추가
   * - 중복 추가 방지 (ON CONFLICT DO NOTHING)
   * - 좋아요 수 증가
   * @param {number} userId - 사용자 ID
   * @param {number} contentId - 콘텐츠 ID
   */
  add: async (userId, contentId) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 즐겨찾기 추가 (이미 있으면 무시)
      const result = await client.query(
        `INSERT INTO user_favorites (user_id, content_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, content_id) DO NOTHING
         RETURNING *`,
        [userId, contentId]
      );

      // 새로 추가된 경우에만 좋아요 수 증가
      if (result.rows.length > 0) {
        await client.query(
          'UPDATE feed_contents SET like_count = like_count + 1 WHERE content_id = $1',
          [contentId]
        );
      }

      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * 즐겨찾기 삭제
   * - 좋아요 수 감소
   * @param {number} userId - 사용자 ID
   * @param {number} contentId - 콘텐츠 ID
   */
  remove: async (userId, contentId) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 즐겨찾기 삭제
      const result = await client.query(
        'DELETE FROM user_favorites WHERE user_id = $1 AND content_id = $2 RETURNING *',
        [userId, contentId]
      );

      // 삭제된 경우에만 좋아요 수 감소
      if (result.rows.length > 0) {
        await client.query(
          'UPDATE feed_contents SET like_count = GREATEST(like_count - 1, 0) WHERE content_id = $1',
          [contentId]
        );
      }

      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * 사용자의 즐겨찾기 목록 조회 (피드 콘텐츠 정보 포함)
   * @param {number} userId - 사용자 ID
   * @param {number} limit - 한 페이지 항목 수
   * @param {number} offset - 건너뛸 항목 수
   */
  findByUserId: async (userId, limit = 20, offset = 0) => {
    const result = await pool.query(
      `SELECT fc.*, h.name AS hospital_name, uf.created_at AS favorited_at
       FROM user_favorites uf
       JOIN feed_contents fc ON uf.content_id = fc.content_id
       JOIN hospitals h ON fc.hospital_id = h.hospital_id
       WHERE uf.user_id = $1
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  /**
   * 즐겨찾기 여부 확인
   * @param {number} userId - 사용자 ID
   * @param {number} contentId - 콘텐츠 ID
   * @returns {boolean}
   */
  check: async (userId, contentId) => {
    const result = await pool.query(
      'SELECT 1 FROM user_favorites WHERE user_id = $1 AND content_id = $2',
      [userId, contentId]
    );
    return result.rows.length > 0;
  },
};

module.exports = Favorite;
