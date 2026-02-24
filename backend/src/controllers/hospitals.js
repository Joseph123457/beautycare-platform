/**
 * 병원 컨트롤러 (검색·상세·카테고리)
 *
 * 핵심 기능:
 *   1) 위치 기반 병원 검색 + 공정 노출 알고리즘
 *   2) 병원 상세 (리뷰·예약 가능 여부 포함)
 *   3) 시술 카테고리 목록
 */
const { pool } = require('../config/database');
const { errorResponse } = require('../utils/response');

// ─── 상수 ────────────────────────────────────────────
/** 지구 반지름 (km) — Haversine 공식에 사용 */
const EARTH_RADIUS_KM = 6371;

/** 카테고리 ENUM 목록 */
const CATEGORIES = ['성형외과', '피부과', '치과', '안과'];

/** 공정 노출 알고리즘 가중치 */
const WEIGHT = {
  RATING: 30,       // 리뷰 평점 (30%)
  RESPONSE: 20,     // 응답률 (20%)
  PROFILE: 10,      // 프로필 완성도 (10%)
  DISTANCE: 20,     // 거리 근접도 (20%)
  RANDOM: 20,       // 랜덤 부스트 (20%)
};

// ─── 1. 위치 기반 병원 검색 ──────────────────────────

/**
 * GET /api/hospitals/search
 *
 * 쿼리 파라미터:
 *   - lat, lng   : 현재 위치 (필수)
 *   - radius     : 검색 반경 km (기본 5)
 *   - category   : 성형외과|피부과|치과|안과 (선택)
 *   - page, limit: 페이지네이션 (기본 page=1, limit=20)
 *
 * 공정 노출 알고리즘으로 정렬하여 반환한다.
 * 광고비가 아닌 리뷰 품질·응답률·거리·랜덤 부스트로 노출 순서 결정.
 */
const searchHospitals = async (req, res, next) => {
  try {
    // ── 파라미터 파싱 & 검증 ──
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return errorResponse(res, '위치 정보(lat, lng)는 필수입니다', 400);
    }

    const radius = parseFloat(req.query.radius) || 5;
    const category = req.query.category || null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    // 카테고리 유효성 검사
    if (category && !CATEGORIES.includes(category)) {
      return errorResponse(
        res,
        `유효하지 않은 카테고리입니다. 가능한 값: ${CATEGORIES.join(', ')}`,
        400
      );
    }

    // ── Haversine 거리 계산 SQL 조각 ──
    // PostGIS 없이 순수 SQL로 두 좌표 간 거리(km)를 계산한다.
    const haversineSQL = `
      (${EARTH_RADIUS_KM} * acos(
        LEAST(1, GREATEST(-1,
          cos(radians($1)) * cos(radians(h.lat)) *
          cos(radians(h.lng) - radians($2))
          + sin(radians($1)) * sin(radians(h.lat))
        ))
      ))
    `;

    // ── 공정 노출 점수 SQL ──
    // 거리 점수: 반경 내에서 가까울수록 1.0에 가까움
    const distanceScoreSQL = `GREATEST(0, 1.0 - (${haversineSQL} / $3))`;

    const fairScoreSQL = `
      (h.avg_rating / 5.0 * ${WEIGHT.RATING})
      + (h.response_rate / 100.0 * ${WEIGHT.RESPONSE})
      + (h.profile_score / 100.0 * ${WEIGHT.PROFILE})
      + (${distanceScoreSQL} * ${WEIGHT.DISTANCE})
      + (random() * ${WEIGHT.RANDOM})
    `;

    // ── 카테고리 필터 조건 ──
    const categoryFilter = category ? 'AND h.category = $4' : '';
    const params = [lat, lng, radius];
    if (category) params.push(category);

    // ── 전체 건수 조회 (페이지네이션 meta용) ──
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM hospitals h
      WHERE ${haversineSQL} <= $3
        ${categoryFilter}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // ── 메인 검색 쿼리 ──
    // 병원 정보 + 거리 + 점수 breakdown + 최근 승인된 리뷰 1개 미리보기
    const limitParamIdx = params.length + 1;
    const offsetParamIdx = params.length + 2;

    const searchQuery = `
      SELECT
        h.hospital_id,
        h.name,
        h.category,
        h.address,
        h.lat,
        h.lng,
        h.description,
        h.operating_hours,
        h.avg_rating,
        h.review_count,
        h.response_rate,
        h.profile_score,
        h.subscription_tier,
        h.is_verified,

        -- 거리 (km, 소수점 2자리)
        ROUND(${haversineSQL}::numeric, 2) AS distance_km,

        -- 공정 노출 점수 breakdown
        ROUND((h.avg_rating / 5.0 * ${WEIGHT.RATING})::numeric, 2)       AS score_rating,
        ROUND((h.response_rate / 100.0 * ${WEIGHT.RESPONSE})::numeric, 2) AS score_response,
        ROUND((h.profile_score / 100.0 * ${WEIGHT.PROFILE})::numeric, 2)  AS score_profile,
        ROUND((${distanceScoreSQL} * ${WEIGHT.DISTANCE})::numeric, 2)      AS score_distance,
        ROUND((random() * ${WEIGHT.RANDOM})::numeric, 2)                   AS score_random,
        ROUND((${fairScoreSQL})::numeric, 2)                               AS total_score,

        -- 최근 승인된 리뷰 1개 미리보기 (서브쿼리)
        (
          SELECT jsonb_build_object(
            'review_id', r.review_id,
            'rating', r.rating,
            'content', LEFT(r.content, 80),
            'author_name', u.name,
            'created_at', r.created_at
          )
          FROM reviews r
          JOIN users u ON u.user_id = r.user_id
          WHERE r.hospital_id = h.hospital_id
            AND r.is_approved = true
          ORDER BY r.created_at DESC
          LIMIT 1
        ) AS latest_review

      FROM hospitals h
      WHERE ${haversineSQL} <= $3
        ${categoryFilter}
      ORDER BY total_score DESC
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
    `;

    params.push(limit, offset);
    const result = await pool.query(searchQuery, params);

    // ── 응답 ──
    return res.json({
      success: true,
      data: result.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      message: `${result.rows.length}개 병원을 찾았습니다`,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. 병원 상세 조회 ──────────────────────────────

/**
 * GET /api/hospitals/:id
 *
 * 응답 내용:
 *   - 병원 전체 정보
 *   - 최근 승인된 리뷰 5개 (랜덤 순서)
 *   - 이번 주 예약 가능 여부 (기존 예약 건수 기반 판단)
 */
const getHospitalDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ── 병원 기본 정보 ──
    const hospitalResult = await pool.query(
      `SELECT
        h.*,
        u.name AS owner_name,
        u.email AS owner_email
       FROM hospitals h
       JOIN users u ON u.user_id = h.owner_user_id
       WHERE h.hospital_id = $1`,
      [id]
    );

    if (hospitalResult.rows.length === 0) {
      return errorResponse(res, '병원을 찾을 수 없습니다', 404);
    }

    const hospital = hospitalResult.rows[0];

    // ── 최근 승인된 리뷰 5개 (랜덤 순서) ──
    const reviewsResult = await pool.query(
      `SELECT
        r.review_id,
        r.rating,
        r.content,
        r.photo_urls,
        r.helpful_count,
        r.created_at,
        u.name AS author_name
       FROM reviews r
       JOIN users u ON u.user_id = r.user_id
       WHERE r.hospital_id = $1
         AND r.is_approved = true
       ORDER BY random()
       LIMIT 5`,
      [id]
    );

    // ── 이번 주 예약 가능 여부 ──
    // 이번 주(월~일) 확정된 예약 건수를 조회하여 판단
    // 하루 최대 예약 수용 10건 × 영업일 6일 = 주간 최대 60건으로 가정
    const WEEKLY_MAX_RESERVATIONS = 60;

    const availabilityResult = await pool.query(
      `SELECT COUNT(*) AS week_count
       FROM reservations
       WHERE hospital_id = $1
         AND status IN ('PENDING', 'CONFIRMED')
         AND reserved_at >= date_trunc('week', NOW())
         AND reserved_at <  date_trunc('week', NOW()) + interval '7 days'`,
      [id]
    );

    const weekCount = parseInt(availabilityResult.rows[0].week_count, 10);

    return res.json({
      success: true,
      data: {
        hospital,
        reviews: reviewsResult.rows,
        availability: {
          this_week_reservations: weekCount,
          max_capacity: WEEKLY_MAX_RESERVATIONS,
          is_available: weekCount < WEEKLY_MAX_RESERVATIONS,
        },
      },
      message: '병원 상세 조회 성공',
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. 시술 카테고리 목록 ──────────────────────────

/**
 * GET /api/hospitals/categories
 *
 * hospital_category ENUM 값을 반환한다.
 * 각 카테고리별 등록된 병원 수도 함께 제공한다.
 */
const getCategories = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        category,
        COUNT(*) AS hospital_count
       FROM hospitals
       GROUP BY category
       ORDER BY hospital_count DESC`
    );

    // DB에 없는 카테고리도 0건으로 포함
    const categoryMap = {};
    result.rows.forEach((row) => {
      categoryMap[row.category] = parseInt(row.hospital_count, 10);
    });

    const categories = CATEGORIES.map((cat) => ({
      name: cat,
      hospital_count: categoryMap[cat] || 0,
    }));

    return res.json({
      success: true,
      data: categories,
      message: '카테고리 목록 조회 성공',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { searchHospitals, getHospitalDetail, getCategories };
