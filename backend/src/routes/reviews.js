/**
 * 리뷰 라우트
 *
 * 인증 필요 엔드포인트:
 *   POST /              — 예약 기반 리뷰 작성
 *   POST /:id/helpful   — 도움이 돼요 토글
 *   PUT  /:id           — 리뷰 수정
 *   DELETE /:id         — 리뷰 삭제
 *
 * 병원 리뷰 목록은 /api/hospitals/:id/reviews 로 접근
 * (hospitals 라우트에서 처리)
 */
const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  createReview,
  toggleHelpful,
  approveReview,
  replyToReview,
} = require('../controllers/reviews');

const router = express.Router();

// ─── 리뷰 작성 유효성 검사 ────────────────────────────
const reviewValidation = [
  body('reservation_id')
    .isInt({ min: 1 }).withMessage('유효한 예약 ID를 입력해주세요'),
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('평점은 1~5 사이 정수여야 합니다'),
  body('content')
    .isLength({ min: 10 }).withMessage('리뷰 내용은 최소 10자 이상이어야 합니다'),
  body('photo_urls')
    .optional()
    .isArray({ max: 10 }).withMessage('사진은 최대 10장까지 첨부할 수 있습니다'),
  body('photo_urls.*')
    .optional()
    .isURL().withMessage('유효한 사진 URL을 입력해주세요'),
];

// ─── 인증 필요 라우트 ─────────────────────────────────

// POST /api/reviews — 예약 기반 리뷰 작성
router.post('/', authMiddleware, reviewValidation, validate, createReview);

// POST /api/reviews/:id/helpful — 도움이 돼요 토글
router.post('/:id/helpful', authMiddleware, toggleHelpful);

// PATCH /api/reviews/:id/approve — 리뷰 승인 (병원 소유자 전용)
router.patch('/:id/approve', authMiddleware, approveReview);

// POST /api/reviews/:id/reply — 리뷰 답변 (병원 소유자 전용)
router.post('/:id/reply', authMiddleware, replyToReview);

module.exports = router;
