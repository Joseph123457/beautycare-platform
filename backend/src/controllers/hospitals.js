/**
 * 병원 컨트롤러 (검색·상세·카테고리·번역)
 *
 * 핵심 기능:
 *   1) 위치 기반 병원 검색 + 공정 노출 알고리즘 (다국어)
 *   2) 병원 상세 (다국어 + 자동 번역)
 *   3) 시술 카테고리 목록
 *   4) 병원 정보 수동/자동 번역
 */
const { pool } = require('../config/database');
const { errorResponse } = require('../utils/response');
const { translateHospitalFields, translateTreatmentFields } = require('../services/translation');

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

/** 다국어 지원 언어 목록 */
const SUPPORTED_LANGS = ['ko', 'en', 'ja', 'zh'];

// ─── 다국어 헬퍼 ─────────────────────────────────────

/**
 * 병원 데이터에서 요청 언어에 맞는 필드를 선택하여 반환
 * 해당 언어 번역이 없으면 한국어(원본)로 폴백
 * @param {object} row - DB 조회 결과 행
 * @param {string} lang - 요청 언어 (ko|en|ja|zh)
 * @returns {object} 로컬라이즈된 병원 데이터
 */
const localizeHospital = (row, lang) => {
  if (lang === 'ko') return row;

  const localized = { ...row };

  // 이름: name_en, name_ja, name_zh → name으로 덮어쓰기
  const localName = row[`name_${lang}`];
  if (localName) localized.name = localName;

  // 설명: description_en 등
  const localDesc = row[`description_${lang}`];
  if (localDesc) localized.description = localDesc;

  // 주소: 영어만 별도 필드 (address_en)
  if (lang === 'en' && row.address_en) {
    localized.address = row.address_en;
  }

  return localized;
};

/**
 * 병원의 빈 번역 필드를 DeepL로 자동 번역 후 DB에 저장
 * 이미 번역된 필드는 건너뛴다 (캐시 역할)
 * @param {object} hospital - DB 병원 행 (h.*)
 * @returns {object} 번역이 채워진 병원 데이터
 */
const autoTranslateIfNeeded = async (hospital) => {
  // 번역이 필요한 필드 확인
  const missingLangs = [];
  for (const lang of ['en', 'ja', 'zh']) {
    if (!hospital[`name_${lang}`] && hospital.name) {
      missingLangs.push(lang);
    }
  }

  if (missingLangs.length === 0) return hospital;

  // DeepL로 번역 실행
  try {
    const translated = await translateHospitalFields({
      name: hospital.name,
      description: hospital.description,
      address: hospital.address,
    });

    // DB에 번역 결과 저장 (빈 필드만)
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(translated)) {
      if (value && !hospital[key]) {
        setClauses.push(`${key} = $${idx}`);
        values.push(value);
        hospital[key] = value; // 응답용으로도 반영
        idx++;
      }
    }

    if (setClauses.length > 0) {
      values.push(hospital.hospital_id);
      await pool.query(
        `UPDATE hospitals SET ${setClauses.join(', ')}, updated_at = NOW()
         WHERE hospital_id = $${idx}`,
        values
      );
    }
  } catch (error) {
    console.error('[자동번역] 병원 번역 실패:', error.message);
    // 번역 실패해도 원본 데이터는 정상 반환
  }

  return hospital;
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
 * Accept-Language 헤더에 따라 해당 언어 필드를 반환한다.
 * 공정 노출 알고리즘으로 정렬 (광고비 아닌 품질 기반).
 */
const searchHospitals = async (req, res, next) => {
  try {
    const lang = req.language || 'ko';

    // ── 파라미터 파싱 & 검증 ──
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return errorResponse(res, req.t('errors:common.validationError'), 400);
    }

    const radius = parseFloat(req.query.radius) || 5;
    const category = req.query.category || null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    // 카테고리 유효성 검사
    if (category && !CATEGORIES.includes(category)) {
      return errorResponse(res, req.t('errors:common.validationError'), 400);
    }

    // ── Haversine 거리 계산 SQL 조각 ──
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

    // ── 전체 건수 조회 ──
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM hospitals h
      WHERE ${haversineSQL} <= $3
        ${categoryFilter}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // ── 메인 검색 쿼리 (다국어 필드 포함) ──
    const limitParamIdx = params.length + 1;
    const offsetParamIdx = params.length + 2;

    const searchQuery = `
      SELECT
        h.hospital_id,
        h.name,
        h.name_en, h.name_ja, h.name_zh,
        h.category,
        h.address,
        h.address_en,
        h.lat,
        h.lng,
        h.description,
        h.description_en, h.description_ja, h.description_zh,
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

        -- 최근 승인된 리뷰 1개 미리보기
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

    // 언어에 맞게 필드 로컬라이즈
    const localizedRows = result.rows.map((row) => localizeHospital(row, lang));

    return res.json({
      success: true,
      data: localizedRows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        language: lang,
      },
      message: req.t('common:hospital.listSuccess'),
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. 병원 상세 조회 (다국어 + 자동 번역) ─────────

/**
 * GET /api/hospitals/:id
 *
 * Accept-Language에 따라 해당 언어 필드 반환.
 * 번역이 없으면 DeepL로 자동 번역 후 DB에 캐시.
 */
const getHospitalDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lang = req.language || 'ko';

    // ── 병원 기본 정보 (다국어 컬럼 포함) ──
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
      return errorResponse(res, req.t('errors:hospital.notFound'), 404);
    }

    let hospital = hospitalResult.rows[0];

    // 한국어가 아닌 경우 자동 번역 시도 (빈 필드만)
    if (lang !== 'ko') {
      hospital = await autoTranslateIfNeeded(hospital);
    }

    // 언어에 맞게 로컬라이즈
    hospital = localizeHospital(hospital, lang);

    // ── 시술 목록 (다국어) ──
    const treatmentsResult = await pool.query(
      `SELECT * FROM treatments
       WHERE hospital_id = $1 AND is_active = true
       ORDER BY name ASC`,
      [id]
    );

    // 시술 목록도 로컬라이즈
    const treatments = treatmentsResult.rows.map((t) => {
      if (lang === 'ko') return t;
      const localized = { ...t };
      if (t[`name_${lang}`]) localized.name = t[`name_${lang}`];
      if (t[`description_${lang}`]) localized.description = t[`description_${lang}`];
      return localized;
    });

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
        treatments,
        reviews: reviewsResult.rows,
        availability: {
          this_week_reservations: weekCount,
          max_capacity: WEEKLY_MAX_RESERVATIONS,
          is_available: weekCount < WEEKLY_MAX_RESERVATIONS,
        },
      },
      message: req.t('common:hospital.detailSuccess'),
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. 시술 카테고리 목록 ──────────────────────────

/**
 * GET /api/hospitals/categories
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
      message: req.t('common:common.success'),
    });
  } catch (error) {
    next(error);
  }
};

// ─── 4. 병원 정보 수동/자동 번역 ─────────────────────

/**
 * POST /api/hospitals/:id/translate
 *
 * 병원 소유자가 다국어 정보를 직접 입력하거나
 * 미입력 필드를 DeepL로 자동 번역한다.
 *
 * 요청 본문 (모두 선택):
 *   - name_en, name_ja, name_zh
 *   - description_en, description_ja, description_zh
 *   - address_en
 *   - auto_fill: true이면 빈 필드를 DeepL로 자동 채움
 */
const translateHospital = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 병원 존재 + 소유자 확인
    const hospitalResult = await pool.query(
      'SELECT * FROM hospitals WHERE hospital_id = $1',
      [id]
    );

    if (hospitalResult.rows.length === 0) {
      return errorResponse(res, req.t('errors:hospital.notFound'), 404);
    }

    const hospital = hospitalResult.rows[0];
    if (hospital.owner_user_id !== req.user.id) {
      return errorResponse(res, req.t('errors:hospital.notOwner'), 403);
    }

    // ── 수동 입력값 적용 ──
    const manualFields = {};
    const allowedFields = [
      'name_en', 'name_ja', 'name_zh',
      'description_en', 'description_ja', 'description_zh',
      'address_en',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        manualFields[field] = req.body[field];
      }
    }

    // ── 자동 번역 (auto_fill=true이면 빈 필드를 DeepL로 채움) ──
    const autoFields = {};
    if (req.body.auto_fill) {
      try {
        const translated = await translateHospitalFields({
          name: hospital.name,
          description: hospital.description,
          address: hospital.address,
        });

        // 수동 입력값이 없고, DB에도 없는 필드만 자동 채움
        for (const [key, value] of Object.entries(translated)) {
          if (!manualFields[key] && !hospital[key] && value) {
            autoFields[key] = value;
          }
        }
      } catch (error) {
        console.error('[번역] 자동 번역 실패:', error.message);
      }
    }

    // ── DB 업데이트 ──
    const allUpdates = { ...autoFields, ...manualFields }; // 수동 입력이 우선

    if (Object.keys(allUpdates).length === 0) {
      return res.json({
        success: true,
        data: hospital,
        message: req.t('common:common.success'),
      });
    }

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(allUpdates)) {
      setClauses.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }

    values.push(id);
    const updateResult = await pool.query(
      `UPDATE hospitals SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE hospital_id = $${idx}
       RETURNING *`,
      values
    );

    return res.json({
      success: true,
      data: updateResult.rows[0],
      message: req.t('common:hospital.updated'),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/hospitals/:id/treatments/:treatmentId/translate
 *
 * 시술 정보 수동/자동 번역
 */
const translateTreatment = async (req, res, next) => {
  try {
    const { id, treatmentId } = req.params;

    // 병원 소유자 확인
    const hospitalResult = await pool.query(
      'SELECT owner_user_id FROM hospitals WHERE hospital_id = $1',
      [id]
    );

    if (hospitalResult.rows.length === 0) {
      return errorResponse(res, req.t('errors:hospital.notFound'), 404);
    }
    if (hospitalResult.rows[0].owner_user_id !== req.user.id) {
      return errorResponse(res, req.t('errors:hospital.notOwner'), 403);
    }

    // 시술 존재 확인
    const treatmentResult = await pool.query(
      'SELECT * FROM treatments WHERE treatment_id = $1 AND hospital_id = $2',
      [treatmentId, id]
    );

    if (treatmentResult.rows.length === 0) {
      return errorResponse(res, req.t('errors:common.notFound'), 404);
    }

    const treatment = treatmentResult.rows[0];

    // ── 수동 입력값 ──
    const manualFields = {};
    const allowedFields = [
      'name_en', 'name_ja', 'name_zh',
      'description_en', 'description_ja', 'description_zh',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        manualFields[field] = req.body[field];
      }
    }

    // ── 자동 번역 ──
    const autoFields = {};
    if (req.body.auto_fill) {
      try {
        const translated = await translateTreatmentFields({
          name: treatment.name,
          description: treatment.description,
        });

        for (const [key, value] of Object.entries(translated)) {
          if (!manualFields[key] && !treatment[key] && value) {
            autoFields[key] = value;
          }
        }
      } catch (error) {
        console.error('[번역] 시술 자동 번역 실패:', error.message);
      }
    }

    // ── DB 업데이트 ──
    const allUpdates = { ...autoFields, ...manualFields };

    if (Object.keys(allUpdates).length === 0) {
      return res.json({ success: true, data: treatment, message: req.t('common:common.success') });
    }

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(allUpdates)) {
      setClauses.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }

    values.push(treatmentId);
    const updateResult = await pool.query(
      `UPDATE treatments SET ${setClauses.join(', ')}
       WHERE treatment_id = $${idx}
       RETURNING *`,
      values
    );

    return res.json({
      success: true,
      data: updateResult.rows[0],
      message: req.t('common:common.success'),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchHospitals,
  getHospitalDetail,
  getCategories,
  translateHospital,
  translateTreatment,
};
