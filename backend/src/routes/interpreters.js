/**
 * 통역 서비스 라우트
 * 통역사 조회·예약·리뷰·관리 엔드포인트를 정의한다.
 */
const express = require('express');
const { body, query } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  getAvailableInterpreters,
  bookInterpreter,
  getMyBookings,
  reviewInterpreter,
  createInterpreter,
} = require('../controllers/interpreters');

const router = express.Router();

/* ── 유효성 검사 규칙 ────────────────────────────────── */

// 통역 예약 생성 유효성 검사
const bookValidation = [
  body('reservation_id').isInt().withMessage('진료 예약 ID를 입력해주세요'),
  body('interpreter_id').isInt().withMessage('통역사 ID를 입력해주세요'),
  body('type').isIn(['PHONE', 'VISIT']).withMessage('통역 유형은 PHONE 또는 VISIT만 가능합니다'),
  body('scheduled_at').isISO8601().withMessage('유효한 통역 예정 일시를 입력해주세요'),
  body('duration_hours').isFloat({ min: 0.5, max: 24 }).withMessage('통역 시간은 0.5~24시간이어야 합니다'),
];

// 통역사 리뷰 유효성 검사
const reviewValidation = [
  body('booking_id').isInt().withMessage('통역 예약 ID를 입력해주세요'),
  body('rating').isFloat({ min: 1, max: 5 }).withMessage('평점은 1~5 사이여야 합니다'),
  body('content').notEmpty().withMessage('리뷰 내용을 입력해주세요'),
];

// 관리자 통역사 등록 유효성 검사
const createInterpreterValidation = [
  body('name').notEmpty().withMessage('통역사 이름을 입력해주세요'),
  body('languages').isArray({ min: 1 }).withMessage('가능 언어를 1개 이상 입력해주세요'),
  body('available_type').isIn(['PHONE', 'VISIT', 'BOTH']).withMessage('유형은 PHONE, VISIT, BOTH만 가능합니다'),
  body('hourly_rate').isInt({ min: 0 }).withMessage('시간당 요금을 입력해주세요'),
];

/* ── 공개 라우트 (인증 불필요) ───────────────────────── */

// GET /api/interpreters/available — 가용 통역사 조회
router.get('/available', getAvailableInterpreters);

/* ── 인증 필요 라우트 ────────────────────────────────── */

// 이하 라우트는 JWT 인증 필수
router.use(authMiddleware);

// POST /api/interpreters/book — 통역 예약
router.post('/book', bookValidation, validate, bookInterpreter);

// GET /api/interpreters/my — 내 통역 예약 목록
router.get('/my', getMyBookings);

// POST /api/interpreters/:id/review — 통역사 리뷰
router.post('/:id/review', reviewValidation, validate, reviewInterpreter);

module.exports = router;

/* ── 관리자 라우트 (별도 export) ─────────────────────── */

const adminRouter = express.Router();
adminRouter.use(authMiddleware);

// POST /api/admin/interpreters — 통역사 등록
adminRouter.post('/', createInterpreterValidation, validate, createInterpreter);

module.exports.adminRouter = adminRouter;
