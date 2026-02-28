/**
 * 피드 콘텐츠 모델
 * 병원이 올리는 시술 전후 사진 피드의 CRUD 쿼리를 처리한다.
 */
const { pool } = require('../config/database');

// 지구 반지름 (km) — Haversine 공식에 사용
const EARTH_RADIUS_KM = 6371;

const FeedContent = {
  /**
   * 피드 목록 조회 (공개)
   * - 승인 + 활성 콘텐츠만 표시
   * - 카테고리 필터, 위치 반경 필터, 커서 기반 페이지네이션
   * - 랜덤 정렬 (TikTok 스타일)
   */
  getFeed: async ({ category, lat, lng, radius, cursor, limit = 10 }) => {
    const conditions = ['fc.is_approved = true', 'fc.is_active = true'];
    const params = [];
    let paramIdx = 1;

    // 카테고리 필터
    if (category) {
      conditions.push(`fc.category = $${paramIdx}`);
      params.push(category);
      paramIdx++;
    }

    // 위치 기반 필터 (Haversine 공식)
    if (lat && lng && radius) {
      conditions.push(`
        (${EARTH_RADIUS_KM} * acos(
          cos(radians($${paramIdx})) * cos(radians(fc.lat)) *
          cos(radians(fc.lng) - radians($${paramIdx + 1})) +
          sin(radians($${paramIdx})) * sin(radians(fc.lat))
        )) <= $${paramIdx + 2}
      `);
      params.push(parseFloat(lat), parseFloat(lng), parseFloat(radius));
      paramIdx += 3;
    }

    // 커서 기반 페이지네이션 (content_id 기준)
    if (cursor) {
      conditions.push(`fc.content_id < $${paramIdx}`);
      params.push(parseInt(cursor));
      paramIdx++;
    }

    // 제한
    params.push(parseInt(limit));

    const query = `
      SELECT fc.*, h.name AS hospital_name
      FROM feed_contents fc
      JOIN hospitals h ON fc.hospital_id = h.hospital_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY RANDOM()
      LIMIT $${paramIdx}
    `;

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * ID로 피드 콘텐츠 상세 조회 (병원 정보 포함)
   * @param {number} id - 콘텐츠 ID
   */
  findById: async (id) => {
    const result = await pool.query(
      `SELECT fc.*, h.name AS hospital_name, h.address AS hospital_address,
              h.category AS hospital_category
       FROM feed_contents fc
       JOIN hospitals h ON fc.hospital_id = h.hospital_id
       WHERE fc.content_id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * 새 피드 콘텐츠 생성
   * @param {object} data - 콘텐츠 정보
   */
  create: async ({ hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng }) => {
    const result = await pool.query(
      `INSERT INTO feed_contents
        (hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        hospital_id,
        category,
        JSON.stringify(photo_urls || []),
        description || null,
        pricing_info || null,
        JSON.stringify(tags || []),
        lat || null,
        lng || null,
      ]
    );
    return result.rows[0];
  },

  /**
   * 피드 콘텐츠 수정 (제공된 필드만 업데이트)
   * @param {number} id - 콘텐츠 ID
   * @param {object} fields - 수정할 필드
   */
  update: async (id, fields) => {
    const setClauses = [];
    const params = [];
    let paramIdx = 1;

    // 업데이트 가능한 필드 목록
    const allowedFields = ['category', 'description', 'pricing_info', 'lat', 'lng'];

    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        setClauses.push(`${field} = $${paramIdx}`);
        params.push(fields[field]);
        paramIdx++;
      }
    }

    // JSONB 필드는 JSON.stringify 처리
    if (fields.photo_urls !== undefined) {
      setClauses.push(`photo_urls = $${paramIdx}`);
      params.push(JSON.stringify(fields.photo_urls));
      paramIdx++;
    }

    if (fields.tags !== undefined) {
      setClauses.push(`tags = $${paramIdx}`);
      params.push(JSON.stringify(fields.tags));
      paramIdx++;
    }

    if (setClauses.length === 0) {
      return FeedContent.findById(id);
    }

    params.push(id);

    const result = await pool.query(
      `UPDATE feed_contents
       SET ${setClauses.join(', ')}
       WHERE content_id = $${paramIdx}
       RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },

  /**
   * 피드 콘텐츠 삭제
   * @param {number} id - 콘텐츠 ID
   */
  delete: async (id) => {
    const result = await pool.query(
      'DELETE FROM feed_contents WHERE content_id = $1 RETURNING content_id',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * 병원 ID로 콘텐츠 목록 조회
   * @param {number} hospitalId - 병원 ID
   * @param {number} limit - 한 페이지 항목 수
   * @param {number} offset - 건너뛸 항목 수
   */
  findByHospitalId: async (hospitalId, limit = 20, offset = 0) => {
    const result = await pool.query(
      `SELECT * FROM feed_contents
       WHERE hospital_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [hospitalId, limit, offset]
    );
    return result.rows;
  },

  /**
   * 조회수 증가
   * @param {number} id - 콘텐츠 ID
   */
  incrementViewCount: async (id) => {
    await pool.query(
      'UPDATE feed_contents SET view_count = view_count + 1 WHERE content_id = $1',
      [id]
    );
  },

  /**
   * 승인 대기 중인 콘텐츠 목록 조회 (관리자용)
   * @param {number} limit - 한 페이지 항목 수
   * @param {number} offset - 건너뛸 항목 수
   */
  getPending: async (limit = 20, offset = 0) => {
    const result = await pool.query(
      `SELECT fc.*, h.name AS hospital_name
       FROM feed_contents fc
       JOIN hospitals h ON fc.hospital_id = h.hospital_id
       WHERE fc.is_approved = false AND fc.is_active = true
       ORDER BY fc.created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  },

  /**
   * 콘텐츠 승인
   * @param {number} id - 콘텐츠 ID
   */
  approve: async (id) => {
    const result = await pool.query(
      'UPDATE feed_contents SET is_approved = true WHERE content_id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * 콘텐츠 거절 (비활성화)
   * @param {number} id - 콘텐츠 ID
   */
  reject: async (id) => {
    const result = await pool.query(
      'UPDATE feed_contents SET is_approved = false, is_active = false WHERE content_id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = FeedContent;
