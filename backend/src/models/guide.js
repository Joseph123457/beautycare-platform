/**
 * 의료관광 가이드 모델
 * 가이드 아티클 및 회복 숙소 관련 데이터베이스 쿼리를 처리한다.
 */
const { pool } = require('../config/database');

/* ── 가이드 아티클 모델 ────────────────────────────────── */

const GuideArticle = {
  /**
   * 가이드 아티클 목록 조회 (카테고리·언어 필터)
   * @param {object} filters - { category, lang }
   * @returns {Array} 가이드 목록 (언어별 필드 반환)
   */
  findAll: async ({ category, lang = 'en' } = {}) => {
    const conditions = ['ga.is_published = true'];
    const params = [];
    let idx = 1;

    // 카테고리 필터
    if (category) {
      conditions.push(`ga.category = $${idx}`);
      params.push(category);
      idx++;
    }

    // 언어별 제목·내용 필드 선택
    const titleField = `title_${lang}`;
    const contentField = `content_${lang}`;

    // 지원하지 않는 언어면 영어로 폴백
    const validLangs = ['ko', 'en', 'ja', 'zh'];
    const safeLang = validLangs.includes(lang) ? lang : 'en';

    const result = await pool.query(
      `SELECT ga.article_id, ga.category,
              ga.title_${safeLang} AS title,
              ga.thumbnail_url, ga.tags, ga.view_count,
              ga.published_at, ga.updated_at
       FROM guide_articles ga
       WHERE ${conditions.join(' AND ')}
       ORDER BY ga.published_at DESC`,
      params
    );
    return result.rows;
  },

  /**
   * 가이드 아티클 상세 조회
   * @param {number} id - 아티클 ID
   * @param {string} lang - 언어 코드
   */
  findById: async (id, lang = 'en') => {
    const validLangs = ['ko', 'en', 'ja', 'zh'];
    const safeLang = validLangs.includes(lang) ? lang : 'en';

    const result = await pool.query(
      `SELECT ga.article_id, ga.category,
              ga.title_${safeLang} AS title,
              ga.content_${safeLang} AS content,
              ga.thumbnail_url, ga.tags, ga.view_count,
              ga.published_at, ga.updated_at
       FROM guide_articles ga
       WHERE ga.article_id = $1 AND ga.is_published = true`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * 조회수 증가
   * @param {number} id - 아티클 ID
   */
  incrementViewCount: async (id) => {
    await pool.query(
      `UPDATE guide_articles SET view_count = view_count + 1 WHERE article_id = $1`,
      [id]
    );
  },
};

/* ── 회복 숙소 모델 ──────────────────────────────────── */

const RecoveryHouse = {
  /**
   * 회복 숙소 목록 조회 (위치 기반 정렬)
   * @param {object} filters - { lat, lng, lang }
   * @returns {Array} 숙소 목록 (거리순 정렬, 언어별 설명)
   */
  findAll: async ({ lat, lng, lang = 'en' } = {}) => {
    const validLangs = ['ko', 'en', 'ja', 'zh'];
    const safeLang = validLangs.includes(lang) ? lang : 'en';

    // 위치가 주어지면 거리 계산 + 정렬
    if (lat && lng) {
      const result = await pool.query(
        `SELECT rh.house_id, rh.name, rh.address, rh.lat, rh.lng,
                rh.description_${safeLang} AS description,
                rh.price_per_night, rh.amenities, rh.photos,
                rh.contact_phone, rh.contact_url,
                rh.rating, rh.review_count,
                -- Haversine 공식으로 거리 계산 (km)
                (6371 * acos(
                  cos(radians($1)) * cos(radians(rh.lat)) *
                  cos(radians(rh.lng) - radians($2)) +
                  sin(radians($1)) * sin(radians(rh.lat))
                )) AS distance_km
         FROM recovery_houses rh
         WHERE rh.is_active = true
         ORDER BY distance_km ASC`,
        [lat, lng]
      );
      return result.rows;
    }

    // 위치 없으면 평점순 정렬
    const result = await pool.query(
      `SELECT rh.house_id, rh.name, rh.address, rh.lat, rh.lng,
              rh.description_${safeLang} AS description,
              rh.price_per_night, rh.amenities, rh.photos,
              rh.contact_phone, rh.contact_url,
              rh.rating, rh.review_count
       FROM recovery_houses rh
       WHERE rh.is_active = true
       ORDER BY rh.rating DESC, rh.review_count DESC`
    );
    return result.rows;
  },

  /**
   * ID로 회복 숙소 조회
   * @param {number} id - 숙소 ID
   * @param {string} lang - 언어 코드
   */
  findById: async (id, lang = 'en') => {
    const validLangs = ['ko', 'en', 'ja', 'zh'];
    const safeLang = validLangs.includes(lang) ? lang : 'en';

    const result = await pool.query(
      `SELECT rh.house_id, rh.name, rh.address, rh.lat, rh.lng,
              rh.description_${safeLang} AS description,
              rh.price_per_night, rh.amenities, rh.photos,
              rh.contact_phone, rh.contact_url,
              rh.rating, rh.review_count
       FROM recovery_houses rh
       WHERE rh.house_id = $1 AND rh.is_active = true`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = { GuideArticle, RecoveryHouse };
