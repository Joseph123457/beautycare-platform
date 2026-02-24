/**
 * 리뷰 모델
 * 리뷰 관련 데이터베이스 쿼리를 처리한다.
 */
const { pool } = require('../config/database');

const Review = {
  // ─── 조회 ───────────────────────────────────────────

  /**
   * ID로 리뷰 조회
   * @param {number} id - 리뷰 ID (review_id)
   */
  findById: async (id) => {
    const result = await pool.query(
      `SELECT r.*, u.name AS author_name, h.name AS hospital_name
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       JOIN hospitals h ON r.hospital_id = h.hospital_id
       WHERE r.review_id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * 특정 예약에 대한 리뷰 존재 여부 확인
   * 같은 예약에 리뷰를 두 번 작성하는 것을 방지한다.
   * @param {number} reservationId - 예약 ID
   */
  findByReservationId: async (reservationId) => {
    const result = await pool.query(
      'SELECT review_id FROM reviews WHERE reservation_id = $1',
      [reservationId]
    );
    return result.rows[0] || null;
  },

  /**
   * 병원별 승인된 리뷰 목록 조회 (정렬 + 페이지네이션)
   *
   * @param {object} options
   * @param {number} options.hospitalId - 병원 ID
   * @param {string} options.sort       - 정렬 기준: 'latest' | 'random' | 'helpful'
   * @param {number} options.limit      - 한 페이지 항목 수
   * @param {number} options.offset     - 건너뛸 항목 수
   */
  findByHospital: async ({ hospitalId, sort = 'latest', limit = 20, offset = 0 }) => {
    // 정렬 기준에 따른 ORDER BY 결정
    let orderClause;
    let extraWhere = '';

    switch (sort) {
      case 'random':
        // 랜덤 노출: is_random_eligible = true 인 리뷰만 대상
        extraWhere = 'AND r.is_random_eligible = true';
        orderClause = 'ORDER BY RANDOM()';
        break;
      case 'helpful':
        // 도움이 돼요 순
        orderClause = 'ORDER BY r.helpful_count DESC, r.created_at DESC';
        break;
      case 'latest':
      default:
        // 최신순
        orderClause = 'ORDER BY r.created_at DESC';
        break;
    }

    const query = `
      SELECT
        r.review_id,
        r.rating,
        r.content,
        r.photo_urls,
        r.helpful_count,
        r.is_random_eligible,
        r.created_at,
        u.name AS author_name
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.hospital_id = $1
        AND r.is_approved = true
        ${extraWhere}
      ${orderClause}
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [hospitalId, limit, offset]);
    return result.rows;
  },

  /**
   * 병원의 승인된 리뷰 총 개수 (페이지네이션 meta용)
   * @param {number} hospitalId - 병원 ID
   * @param {string} sort       - 'random'일 때 is_random_eligible 필터 적용
   */
  countByHospital: async (hospitalId, sort = 'latest') => {
    const extraWhere = sort === 'random' ? 'AND is_random_eligible = true' : '';

    const result = await pool.query(
      `SELECT COUNT(*) AS total
       FROM reviews
       WHERE hospital_id = $1
         AND is_approved = true
         ${extraWhere}`,
      [hospitalId]
    );
    return parseInt(result.rows[0].total, 10);
  },

  // ─── 생성 ───────────────────────────────────────────

  /**
   * 새 리뷰 작성
   * 예약 기반 리뷰: reservation_id, hospital_id 포함
   * is_approved = false 로 저장 (관리자 승인 대기)
   *
   * @param {object} data
   * @param {number} data.user_id        - 작성자 ID
   * @param {number} data.hospital_id    - 병원 ID (예약에서 가져옴)
   * @param {number} data.reservation_id - 예약 ID
   * @param {number} data.rating         - 별점 (1~5)
   * @param {string} data.content        - 리뷰 내용
   * @param {string[]} data.photo_urls   - 사진 URL 배열
   */
  create: async ({ user_id, hospital_id, reservation_id, rating, content, photo_urls = [] }) => {
    const result = await pool.query(
      `INSERT INTO reviews
         (user_id, hospital_id, reservation_id, rating, content, photo_urls, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, false)
       RETURNING *`,
      [user_id, hospital_id, reservation_id, rating, content, JSON.stringify(photo_urls)]
    );
    return result.rows[0];
  },

  // ─── 수정/삭제 ─────────────────────────────────────

  /**
   * 리뷰 수정
   * @param {number} id - 리뷰 ID
   * @param {object} data - { content, rating }
   */
  update: async (id, { content, rating }) => {
    const result = await pool.query(
      `UPDATE reviews
       SET content = COALESCE($1, content),
           rating = COALESCE($2, rating),
           updated_at = NOW()
       WHERE review_id = $3
       RETURNING *`,
      [content, rating, id]
    );
    return result.rows[0] || null;
  },

  /**
   * 리뷰 삭제
   * @param {number} id - 리뷰 ID
   */
  delete: async (id) => {
    const result = await pool.query(
      'DELETE FROM reviews WHERE review_id = $1 RETURNING review_id',
      [id]
    );
    return result.rows[0] || null;
  },

  // ─── 대시보드용 (병원 소유자) ───────────────────────

  /**
   * 병원의 전체 리뷰 목록 (승인 여부 무관, 대시보드용)
   * @param {number} hospitalId - 병원 ID
   * @param {object} options - { page, limit }
   */
  findAllByHospitalForDashboard: async (hospitalId, { page = 1, limit = 50 } = {}) => {
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT r.review_id, r.rating, r.content, r.photo_urls,
              r.helpful_count, r.is_approved, r.created_at,
              r.reply_content, r.replied_at,
              u.name AS author_name
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.hospital_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [hospitalId, limit, offset]
    );
    return result.rows;
  },

  /**
   * 리뷰 승인 (is_approved = true)
   * @param {number} id - 리뷰 ID
   */
  approve: async (id) => {
    const result = await pool.query(
      `UPDATE reviews
       SET is_approved = true, updated_at = NOW()
       WHERE review_id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * 병원 관리자 답변 저장
   * @param {number} id - 리뷰 ID
   * @param {string} content - 답변 내용
   */
  addReply: async (id, content) => {
    const result = await pool.query(
      `UPDATE reviews
       SET reply_content = $1, replied_at = NOW(), updated_at = NOW()
       WHERE review_id = $2
       RETURNING *`,
      [content, id]
    );
    return result.rows[0] || null;
  },

  // ─── 도움이 돼요 ───────────────────────────────────

  /**
   * 사용자가 이미 '도움이 돼요'를 눌렀는지 확인
   * @param {number} reviewId - 리뷰 ID
   * @param {number} userId   - 사용자 ID
   */
  hasUserMarkedHelpful: async (reviewId, userId) => {
    const result = await pool.query(
      'SELECT 1 FROM review_helpfuls WHERE review_id = $1 AND user_id = $2',
      [reviewId, userId]
    );
    return result.rows.length > 0;
  },

  /**
   * '도움이 돼요' 추가
   * review_helpfuls 레코드 삽입 + reviews.helpful_count 증가
   * 트랜잭션으로 원자성 보장
   *
   * @param {number} reviewId - 리뷰 ID
   * @param {number} userId   - 사용자 ID
   * @returns {number} 업데이트 후 helpful_count
   */
  addHelpful: async (reviewId, userId) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1) 기록 삽입
      await client.query(
        'INSERT INTO review_helpfuls (review_id, user_id) VALUES ($1, $2)',
        [reviewId, userId]
      );

      // 2) 카운트 증가 + 갱신된 값 반환
      const result = await client.query(
        `UPDATE reviews
         SET helpful_count = helpful_count + 1, updated_at = NOW()
         WHERE review_id = $1
         RETURNING helpful_count`,
        [reviewId]
      );

      await client.query('COMMIT');
      return result.rows[0].helpful_count;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * '도움이 돼요' 취소
   * review_helpfuls 레코드 삭제 + reviews.helpful_count 감소
   *
   * @param {number} reviewId - 리뷰 ID
   * @param {number} userId   - 사용자 ID
   * @returns {number} 업데이트 후 helpful_count
   */
  removeHelpful: async (reviewId, userId) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'DELETE FROM review_helpfuls WHERE review_id = $1 AND user_id = $2',
        [reviewId, userId]
      );

      const result = await client.query(
        `UPDATE reviews
         SET helpful_count = GREATEST(0, helpful_count - 1), updated_at = NOW()
         WHERE review_id = $1
         RETURNING helpful_count`,
        [reviewId]
      );

      await client.query('COMMIT');
      return result.rows[0].helpful_count;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = Review;
