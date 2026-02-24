/**
 * 리뷰 컨트롤러
 *
 * 엔드포인트:
 *   POST   /api/reviews             — 예약 기반 리뷰 작성
 *   GET    /api/hospitals/:id/reviews — 병원 리뷰 목록 (정렬·페이지네이션)
 *   POST   /api/reviews/:id/helpful  — 도움이 돼요 토글
 */
const { pool } = require('../config/database');
const Review = require('../models/review');
const Hospital = require('../models/hospital');
const { successResponse, errorResponse } = require('../utils/response');
const { analyzeReviewSentiment } = require('../services/aiAnalysis');

// ─── 1. 리뷰 작성 ──────────────────────────────────────

/**
 * POST /api/reviews
 *
 * 요청 body: { reservation_id, rating, content, photo_urls? }
 *
 * 예약 기반 리뷰만 허용한다.
 * 작성 전 3단계 검증:
 *   ① 해당 예약이 요청 사용자의 것인지 (본인 확인)
 *   ② 예약 status가 'DONE'인지 (시술 완료 후에만 작성 가능)
 *   ③ 이미 해당 예약에 리뷰를 작성했는지 (중복 방지)
 *
 * 검증 통과 → is_approved: false (관리자 승인 대기) 상태로 저장
 */
const createReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reservation_id, rating, content, photo_urls } = req.body;

    // ── ① 예약 존재 + 본인 확인 ──
    const reservation = await pool.query(
      `SELECT reservation_id, user_id, hospital_id, status, treatment_name
       FROM reservations
       WHERE reservation_id = $1`,
      [reservation_id]
    );

    if (reservation.rows.length === 0) {
      return errorResponse(res, '존재하지 않는 예약입니다', 404);
    }

    const resv = reservation.rows[0];

    // user_id는 DB에서 BIGINT → 문자열로 올 수 있으므로 동일 타입 비교
    if (String(resv.user_id) !== String(userId)) {
      return errorResponse(
        res,
        '본인의 예약에 대해서만 리뷰를 작성할 수 있습니다',
        403
      );
    }

    // ── ② 시술 완료(DONE) 상태 확인 ──
    if (resv.status !== 'DONE') {
      const statusMessages = {
        PENDING: '아직 예약 대기 중입니다. 시술 완료 후 리뷰를 작성해주세요',
        CONFIRMED: '예약이 확정되었지만 아직 시술이 완료되지 않았습니다',
        CANCELLED: '취소된 예약에는 리뷰를 작성할 수 없습니다',
      };
      return errorResponse(
        res,
        statusMessages[resv.status] || '시술 완료(DONE) 상태의 예약에만 리뷰를 작성할 수 있습니다',
        400
      );
    }

    // ── ③ 중복 리뷰 확인 ──
    const existingReview = await Review.findByReservationId(reservation_id);
    if (existingReview) {
      return errorResponse(
        res,
        '이 예약에 대한 리뷰가 이미 존재합니다. 하나의 예약에 하나의 리뷰만 작성할 수 있습니다',
        409
      );
    }

    // ── 리뷰 저장 (is_approved: false) ──
    const review = await Review.create({
      user_id: userId,
      hospital_id: resv.hospital_id,
      reservation_id,
      rating,
      content,
      photo_urls: photo_urls || [],
    });

    return successResponse(
      res,
      review,
      '리뷰가 작성되었습니다. 관리자 승인 후 공개됩니다',
      201
    );
  } catch (error) {
    next(error);
  }
};

// ─── 2. 병원 리뷰 목록 ─────────────────────────────────

/**
 * GET /api/hospitals/:id/reviews
 *
 * 쿼리 파라미터:
 *   - sort  : 정렬 기준 (latest | random | helpful, 기본: latest)
 *   - page  : 페이지 번호 (기본: 1)
 *   - limit : 페이지당 항목 수 (기본: 20, 최대: 100)
 *
 * 승인된 리뷰(is_approved = true)만 반환한다.
 *
 * sort=random 일 때:
 *   - is_random_eligible = true 인 리뷰만 대상
 *   - PostgreSQL ORDER BY RANDOM() 으로 매 요청마다 다른 순서
 *   - 공정 노출 알고리즘의 일환으로, 특정 리뷰만 상단에 고정되는 것을 방지
 */
const getHospitalReviews = async (req, res, next) => {
  try {
    const hospitalId = req.params.id;

    // ── 쿼리 파라미터 파싱 ──
    const validSorts = ['latest', 'random', 'helpful'];
    const sort = validSorts.includes(req.query.sort) ? req.query.sort : 'latest';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    // ── 병원 존재 확인 ──
    const hospitalCheck = await pool.query(
      'SELECT hospital_id, name FROM hospitals WHERE hospital_id = $1',
      [hospitalId]
    );
    if (hospitalCheck.rows.length === 0) {
      return errorResponse(res, '병원을 찾을 수 없습니다', 404);
    }

    // ── 리뷰 조회 + 총 개수 병렬 실행 ──
    const [reviews, total] = await Promise.all([
      Review.findByHospital({ hospitalId, sort, limit, offset }),
      Review.countByHospital(hospitalId, sort),
    ]);

    return successResponse(res, {
      hospital: hospitalCheck.rows[0],
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        sort,
      },
    }, `리뷰 ${reviews.length}개 조회 성공`);
  } catch (error) {
    next(error);
  }
};

// ─── 3. 도움이 돼요 토글 ────────────────────────────────

/**
 * POST /api/reviews/:id/helpful
 *
 * 토글 방식:
 *   - 아직 누르지 않았으면 → 추가 (helpful_count + 1)
 *   - 이미 눌렀으면 → 취소 (helpful_count - 1)
 *
 * review_helpfuls 테이블로 사용자별 중복 클릭을 방지한다.
 * 트랜잭션 내에서 기록 삽입/삭제 + 카운트 업데이트를 원자적으로 처리한다.
 */
const toggleHelpful = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user.id;

    // ── 리뷰 존재 확인 ──
    const review = await Review.findById(reviewId);
    if (!review) {
      return errorResponse(res, '리뷰를 찾을 수 없습니다', 404);
    }

    // ── 본인 리뷰에는 '도움이 돼요' 불가 ──
    if (String(review.user_id) === String(userId)) {
      return errorResponse(res, '본인이 작성한 리뷰에는 도움이 돼요를 누를 수 없습니다', 400);
    }

    // ── 토글 처리 ──
    const alreadyMarked = await Review.hasUserMarkedHelpful(reviewId, userId);

    let helpfulCount;
    let action;

    if (alreadyMarked) {
      // 이미 눌렀으면 → 취소
      helpfulCount = await Review.removeHelpful(reviewId, userId);
      action = 'removed';
    } else {
      // 아직 안 눌렀으면 → 추가
      helpfulCount = await Review.addHelpful(reviewId, userId);
      action = 'added';
    }

    return successResponse(res, {
      review_id: Number(reviewId),
      helpful_count: helpfulCount,
      is_marked: action === 'added',
    }, action === 'added' ? '도움이 돼요를 눌렀습니다' : '도움이 돼요를 취소했습니다');
  } catch (error) {
    next(error);
  }
};

// ─── 4. 대시보드용 리뷰 목록 (병원 소유자 전용) ─────

/**
 * GET /api/hospitals/:id/reviews/dashboard
 *
 * 병원 소유자 전용: 승인 여부 무관 전체 리뷰 반환
 * 쿼리: page (기본 1)
 */
const getHospitalReviewsForDashboard = async (req, res, next) => {
  try {
    const hospitalId = req.params.id;

    // 병원 존재 + 소유자 권한 검증
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return errorResponse(res, '병원을 찾을 수 없습니다', 404);
    }
    if (hospital.owner_user_id !== req.user.id) {
      return errorResponse(res, '해당 병원의 리뷰를 조회할 권한이 없습니다', 403);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const reviews = await Review.findAllByHospitalForDashboard(hospitalId, { page });

    return successResponse(res, reviews, '리뷰 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

// ─── 5. 리뷰 승인 ──────────────────────────────────────

/**
 * PATCH /api/reviews/:id/approve
 *
 * 병원 소유자만 승인 가능
 */
const approveReview = async (req, res, next) => {
  try {
    const reviewId = req.params.id;

    // 리뷰 존재 확인
    const review = await Review.findById(reviewId);
    if (!review) {
      return errorResponse(res, '리뷰를 찾을 수 없습니다', 404);
    }

    // 병원 소유자 권한 검증
    const hospital = await Hospital.findById(review.hospital_id);
    if (!hospital || hospital.owner_user_id !== req.user.id) {
      return errorResponse(res, '해당 리뷰를 승인할 권한이 없습니다', 403);
    }

    if (review.is_approved) {
      return errorResponse(res, '이미 승인된 리뷰입니다', 400);
    }

    const updated = await Review.approve(reviewId);

    // AI 감성 분석 (비동기 - 응답을 차단하지 않음)
    analyzeReviewSentiment(review.content, review.rating)
      .then(async (analysis) => {
        if (analysis) {
          await pool.query(
            'UPDATE reviews SET ai_analysis = $1 WHERE review_id = $2',
            [JSON.stringify(analysis), reviewId]
          );
        }
      })
      .catch((err) => console.error('AI 분석 실패:', err));

    return successResponse(res, updated, '리뷰가 승인되었습니다');
  } catch (error) {
    next(error);
  }
};

// ─── 6. 리뷰 답변 ──────────────────────────────────────

/**
 * POST /api/reviews/:id/reply
 *
 * 병원 소유자만 답변 가능
 * body: { content }
 */
const replyToReview = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return errorResponse(res, '답변 내용을 입력해주세요', 400);
    }

    // 리뷰 존재 확인
    const review = await Review.findById(reviewId);
    if (!review) {
      return errorResponse(res, '리뷰를 찾을 수 없습니다', 404);
    }

    // 병원 소유자 권한 검증
    const hospital = await Hospital.findById(review.hospital_id);
    if (!hospital || hospital.owner_user_id !== req.user.id) {
      return errorResponse(res, '해당 리뷰에 답변할 권한이 없습니다', 403);
    }

    const updated = await Review.addReply(reviewId, content.trim());
    return successResponse(res, updated, '답변이 등록되었습니다');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getHospitalReviews,
  toggleHelpful,
  getHospitalReviewsForDashboard,
  approveReview,
  replyToReview,
};
