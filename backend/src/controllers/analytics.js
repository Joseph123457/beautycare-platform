/**
 * 병원 통계 분석 컨트롤러
 *
 * 병원 운영 데이터를 집계하여 통계를 제공한다.
 * 모든 결과는 Redis에 1시간 캐시 적용.
 *
 * 엔드포인트:
 *   GET /api/analytics/overview/:hospital_id   — 전체 현황
 *   GET /api/analytics/treatments/:hospital_id — 시술별 분석
 *   GET /api/analytics/time/:hospital_id       — 시간대별 분석
 *   GET /api/analytics/exposure/:hospital_id   — 노출 분석
 */
const { pool } = require('../config/database');
const env = require('../config/env');
const { successResponse, errorResponse } = require('../utils/response');

// ─── Redis 캐시 설정 ─────────────────────────────────
const CACHE_TTL = 3600; // 1시간 (초)
let redisClient = null;

/**
 * Redis 클라이언트 지연 초기화
 * 첫 요청 시 한 번만 연결한다. 연결 실패 시 캐시 없이 동작.
 */
const getRedis = async () => {
  if (redisClient) return redisClient;
  try {
    const { createClient } = require('redis');
    redisClient = createClient({
      socket: { host: env.redis.host, port: env.redis.port },
      password: env.redis.password || undefined,
    });
    redisClient.on('error', (err) => {
      console.error('Analytics Redis 에러:', err.message);
    });
    await redisClient.connect();
    return redisClient;
  } catch {
    console.warn('Analytics Redis 연결 실패 — 캐시 없이 동작합니다');
    return null;
  }
};

/**
 * 캐시에서 데이터 조회
 * @param {string} key - 캐시 키
 * @returns {object|null} 캐시된 데이터 또는 null
 */
const getCache = async (key) => {
  try {
    const redis = await getRedis();
    if (!redis) return null;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

/**
 * 캐시에 데이터 저장
 * @param {string} key - 캐시 키
 * @param {object} data - 저장할 데이터
 */
const setCache = async (key, data) => {
  try {
    const redis = await getRedis();
    if (!redis) return;
    await redis.set(key, JSON.stringify(data), { EX: CACHE_TTL });
  } catch {
    // 캐시 저장 실패는 무시
  }
};

// ─── 기간 파라미터 → SQL 인터벌 변환 ─────────────────
const PERIOD_MAP = {
  '7d': { interval: '7 days', days: 7 },
  '30d': { interval: '30 days', days: 30 },
  '90d': { interval: '90 days', days: 90 },
  '1y': { interval: '1 year', days: 365 },
};

/**
 * 기간 파라미터 검증 및 변환
 * @param {string} period - 7d|30d|90d|1y
 * @returns {{ interval: string, days: number }} SQL 인터벌 정보
 */
const parsePeriod = (period) => {
  return PERIOD_MAP[period] || PERIOD_MAP['30d'];
};

// ─── 병원 소유권 검증 ─────────────────────────────────
/**
 * 요청 사용자가 병원 소유자인지 확인
 * req.hospital이 있으면 (subscription 미들웨어에서 주입) 그것을 사용
 * @param {number} hospitalId - 병원 ID
 * @param {number} userId - 사용자 ID
 * @param {object} reqHospital - req.hospital (subscription 미들웨어에서 주입)
 * @returns {boolean}
 */
const verifyOwnership = (hospitalId, userId, reqHospital) => {
  if (reqHospital) {
    return reqHospital.hospital_id === Number(hospitalId);
  }
  return false;
};

// ═══════════════════════════════════════════════════════
// 1. 전체 현황 (Overview)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/analytics/overview/:hospital_id
 *
 * 병원의 전체 운영 현황을 반환한다.
 * 쿼리 파라미터: period=7d|30d|90d|1y (기본: 30d)
 *
 * 반환:
 *   - reservationTrend: 일별 예약 수 추이
 *   - summary: 총 예약, 완료율, 전환율 추정
 *   - revenue: 매출 추정 (완료 건수 × 평균 시술가)
 *   - patientRatio: 신규 vs 재방문 환자 비율
 *   - ratingTrend: 월별 리뷰 평균 점수 추이
 */
const getOverview = async (req, res, next) => {
  try {
    const { hospital_id } = req.params;
    const { period = '30d' } = req.query;

    // 소유권 검증
    if (!verifyOwnership(hospital_id, req.user.id, req.hospital)) {
      return errorResponse(res, '해당 병원의 통계를 조회할 권한이 없습니다', 403);
    }

    const { interval, days } = parsePeriod(period);
    const cacheKey = `analytics:overview:${hospital_id}:${period}`;

    // 캐시 확인
    const cached = await getCache(cacheKey);
    if (cached) return successResponse(res, cached, '통계 조회 성공 (캐시)');

    // ── 1) 일별 예약 수 추이 ──
    const trendResult = await pool.query(
      `SELECT
         DATE(reserved_at AT TIME ZONE 'Asia/Seoul') AS date,
         COUNT(*) AS count
       FROM reservations
       WHERE hospital_id = $1
         AND reserved_at >= NOW() - $2::interval
       GROUP BY DATE(reserved_at AT TIME ZONE 'Asia/Seoul')
       ORDER BY date ASC`,
      [hospital_id, interval]
    );

    // ── 2) 예약 요약 (상태별 카운트) ──
    const summaryResult = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'DONE') AS completed,
         COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS confirmed,
         COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
         COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled
       FROM reservations
       WHERE hospital_id = $1
         AND reserved_at >= NOW() - $2::interval`,
      [hospital_id, interval]
    );

    const summary = summaryResult.rows[0];
    const total = parseInt(summary.total, 10);
    const completed = parseInt(summary.completed, 10);

    // ── 3) 매출 추정 (완료 건수 기반) ──
    //   실제 시술가 데이터가 없으므로 결제 내역에서 계산하거나
    //   완료 예약 건수만 반환한다.
    const revenueResult = await pool.query(
      `SELECT
         COALESCE(SUM(p.amount), 0) AS total_revenue,
         COUNT(p.payment_id) AS payment_count
       FROM payments p
       WHERE p.hospital_id = $1
         AND p.status = 'SUCCESS'
         AND p.paid_at >= NOW() - $2::interval`,
      [hospital_id, interval]
    );

    // 월별 매출 추이
    const revenueMonthlyResult = await pool.query(
      `SELECT
         TO_CHAR(paid_at, 'YYYY-MM') AS month,
         SUM(amount) AS revenue,
         COUNT(*) AS count
       FROM payments
       WHERE hospital_id = $1
         AND status = 'SUCCESS'
         AND paid_at >= NOW() - $2::interval
       GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
       ORDER BY month ASC`,
      [hospital_id, interval]
    );

    // ── 4) 신규 vs 재방문 환자 비율 ──
    //   해당 기간에 첫 예약인 환자 = 신규, 이전에도 예약이 있었으면 = 재방문
    const patientResult = await pool.query(
      `WITH period_patients AS (
         SELECT DISTINCT user_id
         FROM reservations
         WHERE hospital_id = $1
           AND reserved_at >= NOW() - $2::interval
       ),
       first_visits AS (
         SELECT user_id, MIN(reserved_at) AS first_visit
         FROM reservations
         WHERE hospital_id = $1
         GROUP BY user_id
       )
       SELECT
         COUNT(*) AS total_patients,
         COUNT(*) FILTER (
           WHERE fv.first_visit >= NOW() - $2::interval
         ) AS new_patients,
         COUNT(*) FILTER (
           WHERE fv.first_visit < NOW() - $2::interval
         ) AS returning_patients
       FROM period_patients pp
       JOIN first_visits fv ON pp.user_id = fv.user_id`,
      [hospital_id, interval]
    );

    // ── 5) 리뷰 평균 점수 추이 (월별) ──
    const ratingResult = await pool.query(
      `SELECT
         TO_CHAR(created_at, 'YYYY-MM') AS month,
         ROUND(AVG(rating), 2) AS avg_rating,
         COUNT(*) AS review_count
       FROM reviews
       WHERE hospital_id = $1
         AND created_at >= NOW() - $2::interval
       GROUP BY TO_CHAR(created_at, 'YYYY-MM')
       ORDER BY month ASC`,
      [hospital_id, interval]
    );

    // ── 응답 데이터 조립 ──
    const patient = patientResult.rows[0];
    const totalPatients = parseInt(patient.total_patients, 10);

    const data = {
      period,
      days,
      reservationTrend: trendResult.rows.map((r) => ({
        date: r.date,
        count: parseInt(r.count, 10),
      })),
      summary: {
        total,
        completed,
        confirmed: parseInt(summary.confirmed, 10),
        pending: parseInt(summary.pending, 10),
        cancelled: parseInt(summary.cancelled, 10),
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      revenue: {
        total: parseInt(revenueResult.rows[0].total_revenue, 10),
        paymentCount: parseInt(revenueResult.rows[0].payment_count, 10),
        monthly: revenueMonthlyResult.rows.map((r) => ({
          month: r.month,
          revenue: parseInt(r.revenue, 10),
          count: parseInt(r.count, 10),
        })),
      },
      patientRatio: {
        total: totalPatients,
        new: parseInt(patient.new_patients, 10),
        returning: parseInt(patient.returning_patients, 10),
        newRate: totalPatients > 0
          ? Math.round((parseInt(patient.new_patients, 10) / totalPatients) * 100)
          : 0,
      },
      ratingTrend: ratingResult.rows.map((r) => ({
        month: r.month,
        avgRating: parseFloat(r.avg_rating),
        reviewCount: parseInt(r.review_count, 10),
      })),
    };

    await setCache(cacheKey, data);
    return successResponse(res, data, '전체 현황 조회 성공');
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════
// 2. 시술별 분석 (Treatments)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/analytics/treatments/:hospital_id
 *
 * 시술별 예약 현황 및 성과를 분석한다.
 * 쿼리 파라미터: period=7d|30d|90d|1y (기본: 30d)
 *
 * 반환:
 *   - ranking: 시술별 예약 수 순위
 *   - ratings: 시술별 평균 평점
 *   - rebookingRate: 시술별 재예약율
 */
const getTreatments = async (req, res, next) => {
  try {
    const { hospital_id } = req.params;
    const { period = '30d' } = req.query;

    if (!verifyOwnership(hospital_id, req.user.id, req.hospital)) {
      return errorResponse(res, '해당 병원의 통계를 조회할 권한이 없습니다', 403);
    }

    const { interval } = parsePeriod(period);
    const cacheKey = `analytics:treatments:${hospital_id}:${period}`;

    const cached = await getCache(cacheKey);
    if (cached) return successResponse(res, cached, '시술별 분석 조회 성공 (캐시)');

    // ── 1) 시술별 예약 수 순위 ──
    const rankingResult = await pool.query(
      `SELECT
         treatment_name,
         COUNT(*) AS total_count,
         COUNT(*) FILTER (WHERE status = 'DONE') AS completed_count,
         COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_count
       FROM reservations
       WHERE hospital_id = $1
         AND reserved_at >= NOW() - $2::interval
       GROUP BY treatment_name
       ORDER BY total_count DESC
       LIMIT 10`,
      [hospital_id, interval]
    );

    // ── 2) 시술별 평균 평점 ──
    //   예약-리뷰 조인으로 시술명별 평점 집계
    const ratingsResult = await pool.query(
      `SELECT
         r.treatment_name,
         ROUND(AVG(rv.rating), 2) AS avg_rating,
         COUNT(rv.review_id) AS review_count
       FROM reservations r
       JOIN reviews rv ON rv.reservation_id = r.reservation_id
       WHERE r.hospital_id = $1
         AND r.reserved_at >= NOW() - $2::interval
       GROUP BY r.treatment_name
       ORDER BY avg_rating DESC`,
      [hospital_id, interval]
    );

    // ── 3) 시술별 재예약율 ──
    //   같은 시술을 2회 이상 예약한 환자 비율
    const rebookingResult = await pool.query(
      `WITH treatment_user_counts AS (
         SELECT
           treatment_name,
           user_id,
           COUNT(*) AS visit_count
         FROM reservations
         WHERE hospital_id = $1
           AND status IN ('DONE', 'CONFIRMED')
         GROUP BY treatment_name, user_id
       )
       SELECT
         treatment_name,
         COUNT(*) AS total_users,
         COUNT(*) FILTER (WHERE visit_count >= 2) AS repeat_users,
         CASE
           WHEN COUNT(*) > 0
           THEN ROUND(
             (COUNT(*) FILTER (WHERE visit_count >= 2))::numeric / COUNT(*) * 100, 1
           )
           ELSE 0
         END AS rebooking_rate
       FROM treatment_user_counts
       GROUP BY treatment_name
       ORDER BY rebooking_rate DESC`,
      [hospital_id]
    );

    const data = {
      period,
      ranking: rankingResult.rows.map((r) => ({
        treatmentName: r.treatment_name,
        totalCount: parseInt(r.total_count, 10),
        completedCount: parseInt(r.completed_count, 10),
        cancelledCount: parseInt(r.cancelled_count, 10),
      })),
      ratings: ratingsResult.rows.map((r) => ({
        treatmentName: r.treatment_name,
        avgRating: parseFloat(r.avg_rating),
        reviewCount: parseInt(r.review_count, 10),
      })),
      rebookingRate: rebookingResult.rows.map((r) => ({
        treatmentName: r.treatment_name,
        totalUsers: parseInt(r.total_users, 10),
        repeatUsers: parseInt(r.repeat_users, 10),
        rate: parseFloat(r.rebooking_rate),
      })),
    };

    await setCache(cacheKey, data);
    return successResponse(res, data, '시술별 분석 조회 성공');
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════
// 3. 시간대별 분석 (Time)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/analytics/time/:hospital_id
 *
 * 요일·시간대별 예약 분포를 분석한다.
 * 쿼리 파라미터: period=7d|30d|90d|1y (기본: 30d)
 *
 * 반환:
 *   - byDayOfWeek: 요일별 예약 분포 (0=일, 6=토)
 *   - byTimeSlot: 시간대별 예약 분포 (오전/오후/저녁)
 *   - byHour: 시간별 예약 분포 (0~23시)
 *   - peakRecommendation: 최적 영업시간 추천
 */
const getTimeAnalysis = async (req, res, next) => {
  try {
    const { hospital_id } = req.params;
    const { period = '30d' } = req.query;

    if (!verifyOwnership(hospital_id, req.user.id, req.hospital)) {
      return errorResponse(res, '해당 병원의 통계를 조회할 권한이 없습니다', 403);
    }

    const { interval } = parsePeriod(period);
    const cacheKey = `analytics:time:${hospital_id}:${period}`;

    const cached = await getCache(cacheKey);
    if (cached) return successResponse(res, cached, '시간대별 분석 조회 성공 (캐시)');

    // 요일 한국어 이름
    const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

    // ── 1) 요일별 예약 분포 ──
    const dayResult = await pool.query(
      `SELECT
         EXTRACT(DOW FROM reserved_at AT TIME ZONE 'Asia/Seoul') AS dow,
         COUNT(*) AS count
       FROM reservations
       WHERE hospital_id = $1
         AND reserved_at >= NOW() - $2::interval
       GROUP BY dow
       ORDER BY dow`,
      [hospital_id, interval]
    );

    // 0~6 모든 요일 채우기 (데이터 없으면 0)
    const dayMap = new Map(dayResult.rows.map((r) => [parseInt(r.dow, 10), parseInt(r.count, 10)]));
    const byDayOfWeek = Array.from({ length: 7 }, (_, i) => ({
      day: i,
      dayName: DAY_NAMES[i],
      count: dayMap.get(i) || 0,
    }));

    // ── 2) 시간별 예약 분포 (0~23시) ──
    const hourResult = await pool.query(
      `SELECT
         EXTRACT(HOUR FROM reserved_at AT TIME ZONE 'Asia/Seoul') AS hour,
         COUNT(*) AS count
       FROM reservations
       WHERE hospital_id = $1
         AND reserved_at >= NOW() - $2::interval
       GROUP BY hour
       ORDER BY hour`,
      [hospital_id, interval]
    );

    // 0~23 모든 시간 채우기
    const hourMap = new Map(hourResult.rows.map((r) => [parseInt(r.hour, 10), parseInt(r.count, 10)]));
    const byHour = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourMap.get(i) || 0,
    }));

    // ── 3) 시간대별 구간 집계 (오전/오후/저녁) ──
    const timeSlots = [
      { name: '오전', label: '09:00-12:00', range: [9, 12] },
      { name: '오후', label: '12:00-18:00', range: [12, 18] },
      { name: '저녁', label: '18:00-21:00', range: [18, 21] },
      { name: '기타', label: '21:00-09:00', range: null },
    ];

    const byTimeSlot = timeSlots.map((slot) => {
      let count = 0;
      if (slot.range) {
        for (let h = slot.range[0]; h < slot.range[1]; h++) {
          count += hourMap.get(h) || 0;
        }
      } else {
        // 기타: 21~23 + 0~8
        for (let h = 21; h < 24; h++) count += hourMap.get(h) || 0;
        for (let h = 0; h < 9; h++) count += hourMap.get(h) || 0;
      }
      return { name: slot.name, label: slot.label, count };
    });

    // ── 4) 최적 영업시간 추천 ──
    //   가장 예약이 몰리는 상위 3개 시간대와 상위 요일
    const peakHours = [...byHour]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((h) => `${h.hour}시`);

    const peakDays = [...byDayOfWeek]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((d) => d.dayName);

    const busiestSlot = [...byTimeSlot]
      .sort((a, b) => b.count - a.count)[0];

    const data = {
      period,
      byDayOfWeek,
      byHour,
      byTimeSlot,
      peakRecommendation: {
        peakHours,
        peakDays,
        busiestSlot: busiestSlot ? busiestSlot.name : null,
        message: peakDays.length > 0
          ? `${peakDays.join(', ')}요일 ${busiestSlot?.label || ''} 시간대에 예약이 가장 많습니다`
          : '분석할 예약 데이터가 부족합니다',
      },
    };

    await setCache(cacheKey, data);
    return successResponse(res, data, '시간대별 분석 조회 성공');
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════
// 4. 노출 분석 (Exposure)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/analytics/exposure/:hospital_id
 *
 * 검색 노출 성과 및 알고리즘 점수를 분석한다.
 *
 * 반환:
 *   - algorithmScore: 알고리즘 점수 breakdown
 *   - competitivePosition: 경쟁 병원 대비 내 순위 (익명)
 *   - conversionFunnel: 노출 → 클릭 → 예약 퍼널
 */
const getExposure = async (req, res, next) => {
  try {
    const { hospital_id } = req.params;

    if (!verifyOwnership(hospital_id, req.user.id, req.hospital)) {
      return errorResponse(res, '해당 병원의 통계를 조회할 권한이 없습니다', 403);
    }

    const cacheKey = `analytics:exposure:${hospital_id}`;

    const cached = await getCache(cacheKey);
    if (cached) return successResponse(res, cached, '노출 분석 조회 성공 (캐시)');

    // ── 1) 내 병원의 알고리즘 점수 ──
    const myHospitalResult = await pool.query(
      `SELECT
         hospital_id, name, category,
         profile_score, avg_rating, review_count, response_rate
       FROM hospitals
       WHERE hospital_id = $1`,
      [hospital_id]
    );

    if (myHospitalResult.rows.length === 0) {
      return errorResponse(res, '병원을 찾을 수 없습니다', 404);
    }

    const myHospital = myHospitalResult.rows[0];

    // 알고리즘 점수 상세 breakdown
    // 공정 노출 알고리즘 기준: 프로필 완성도(30%) + 평균 평점(25%) + 리뷰 수(20%) + 응답률(25%)
    const profileScore = parseFloat(myHospital.profile_score) || 0;
    const avgRating = parseFloat(myHospital.avg_rating) || 0;
    const reviewCount = parseInt(myHospital.review_count, 10) || 0;
    const responseRate = parseFloat(myHospital.response_rate) || 0;

    // 리뷰 수 점수: 최대 50개 기준으로 정규화
    const reviewScore = Math.min(reviewCount / 50, 1) * 100;

    const algorithmScore = {
      total: Math.round(
        profileScore * 0.3 +
        (avgRating / 5) * 100 * 0.25 +
        reviewScore * 0.2 +
        responseRate * 0.25
      ),
      breakdown: {
        profile: { score: Math.round(profileScore), weight: 30, label: '프로필 완성도' },
        rating: { score: Math.round((avgRating / 5) * 100), weight: 25, label: '평균 평점' },
        reviews: { score: Math.round(reviewScore), weight: 20, label: '리뷰 수' },
        responseRate: { score: Math.round(responseRate), weight: 25, label: '응답률' },
      },
    };

    // ── 2) 경쟁 병원 대비 포지션 (같은 카테고리 내 익명 순위) ──
    const categoryStatsResult = await pool.query(
      `SELECT
         COUNT(*) AS total_hospitals,
         AVG(avg_rating) AS category_avg_rating,
         AVG(review_count) AS category_avg_reviews,
         AVG(response_rate) AS category_avg_response_rate,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_rating) AS median_rating
       FROM hospitals
       WHERE category = $1`,
      [myHospital.category]
    );

    // 내 순위 (평균 평점 기준 퍼센타일)
    const rankResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE avg_rating <= $2) AS rank_below,
         COUNT(*) AS total
       FROM hospitals
       WHERE category = $1`,
      [myHospital.category, avgRating]
    );

    const categoryStats = categoryStatsResult.rows[0];
    const rank = rankResult.rows[0];
    const totalInCategory = parseInt(rank.total, 10);
    const rankBelow = parseInt(rank.rank_below, 10);
    const percentile = totalInCategory > 0
      ? Math.round((rankBelow / totalInCategory) * 100)
      : 0;

    const competitivePosition = {
      category: myHospital.category,
      totalInCategory,
      myPercentile: percentile, // 상위 (100 - percentile)%
      topPercent: 100 - percentile,
      categoryAvg: {
        avgRating: parseFloat(parseFloat(categoryStats.category_avg_rating || 0).toFixed(2)),
        avgReviews: Math.round(parseFloat(categoryStats.category_avg_reviews || 0)),
        avgResponseRate: Math.round(parseFloat(categoryStats.category_avg_response_rate || 0)),
      },
      myStats: {
        avgRating,
        reviewCount,
        responseRate: Math.round(responseRate),
      },
    };

    // ── 3) 전환 퍼널 추정 (최근 30일) ──
    //   노출/클릭 데이터가 없으므로 예약 기반 퍼널만 제공
    const funnelResult = await pool.query(
      `SELECT
         COUNT(*) AS total_reservations,
         COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS confirmed,
         COUNT(*) FILTER (WHERE status = 'DONE') AS completed,
         COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled
       FROM reservations
       WHERE hospital_id = $1
         AND reserved_at >= NOW() - INTERVAL '30 days'`,
      [hospital_id]
    );

    const funnel = funnelResult.rows[0];
    const totalReservations = parseInt(funnel.total_reservations, 10);

    const conversionFunnel = {
      reservations: totalReservations,
      confirmed: parseInt(funnel.confirmed, 10),
      completed: parseInt(funnel.completed, 10),
      cancelled: parseInt(funnel.cancelled, 10),
      confirmRate: totalReservations > 0
        ? Math.round((parseInt(funnel.confirmed, 10) / totalReservations) * 100)
        : 0,
      completionRate: totalReservations > 0
        ? Math.round((parseInt(funnel.completed, 10) / totalReservations) * 100)
        : 0,
    };

    const data = {
      algorithmScore,
      competitivePosition,
      conversionFunnel,
    };

    await setCache(cacheKey, data);
    return successResponse(res, data, '노출 분석 조회 성공');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getTreatments,
  getTimeAnalysis,
  getExposure,
};
