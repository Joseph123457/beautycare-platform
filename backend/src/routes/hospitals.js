/**
 * 병원 라우트
 *
 * 공개 엔드포인트:
 *   GET /search       — 위치 기반 병원 검색 (공정 노출 알고리즘)
 *   GET /categories   — 시술 카테고리 목록
 *   GET /:id          — 병원 상세 조회
 *   GET /:id/reviews  — 병원 리뷰 목록 (정렬·페이지네이션)
 *
 * 인증 필요 엔드포인트:
 *   POST /           — 병원 등록
 *   PUT  /:id        — 병원 수정
 *   DELETE /:id      — 병원 삭제
 *   POST /:id/translate                    — 병원 정보 수동 번역
 *   POST /:id/treatments/:tid/translate    — 시술 정보 수동 번역
 */
const express = require('express');
const { body, query } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');

// 검색·상세·카테고리·번역 컨트롤러
const {
  searchHospitals,
  getHospitalDetail,
  getCategories,
  translateHospital,
  translateTreatment,
} = require('../controllers/hospitals');

// 기존 CRUD 컨트롤러
const {
  createHospital,
  updateHospital,
  deleteHospital,
} = require('../controllers/hospitalController');

// 리뷰 컨트롤러
const { getHospitalReviews, getHospitalReviewsForDashboard } = require('../controllers/reviews');

// 예약 컨트롤러
const { getHospitalReservations } = require('../controllers/reservationController');

const router = express.Router();

// ─── 검색 파라미터 유효성 검사 ───────────────────────
const searchValidation = [
  query('lat')
    .notEmpty().withMessage('위도(lat)는 필수입니다')
    .isFloat({ min: -90, max: 90 }).withMessage('위도는 -90 ~ 90 사이여야 합니다'),
  query('lng')
    .notEmpty().withMessage('경도(lng)는 필수입니다')
    .isFloat({ min: -180, max: 180 }).withMessage('경도는 -180 ~ 180 사이여야 합니다'),
];

// ─── 병원 등록 유효성 검사 ───────────────────────────
const hospitalValidation = [
  body('name').notEmpty().withMessage('병원 이름을 입력해주세요'),
  body('address').notEmpty().withMessage('주소를 입력해주세요'),
  body('category').notEmpty().withMessage('진료 카테고리를 입력해주세요'),
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('유효한 위도를 입력해주세요'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('유효한 경도를 입력해주세요'),
];

// ─── 공개 라우트 ─────────────────────────────────────

// GET /api/hospitals/search — 위치 기반 병원 검색
router.get('/search', searchValidation, validate, searchHospitals);

// GET /api/hospitals/categories — 시술 카테고리 목록
router.get('/categories', getCategories);

// GET /api/hospitals/:id — 병원 상세 조회
router.get('/:id', getHospitalDetail);

// GET /api/hospitals/:id/reviews — 병원 리뷰 목록
router.get('/:id/reviews', getHospitalReviews);

// GET /api/hospitals/:id/reviews/dashboard — 대시보드 리뷰 목록 (인증 필요)
router.get('/:id/reviews/dashboard', authMiddleware, getHospitalReviewsForDashboard);

// GET /api/hospitals/:id/reservations — 병원 예약 목록 (인증 필요)
router.get('/:id/reservations', authMiddleware, getHospitalReservations);

// ─── 인증 필요 라우트 ───────────────────────────────

// POST /api/hospitals — 병원 등록
router.post('/', authMiddleware, hospitalValidation, validate, createHospital);

// PUT /api/hospitals/:id — 병원 수정
router.put('/:id', authMiddleware, updateHospital);

// DELETE /api/hospitals/:id — 병원 삭제
router.delete('/:id', authMiddleware, deleteHospital);

// ─── 번역 라우트 (인증 필요) ─────────────────────────

// POST /api/hospitals/:id/translate — 병원 정보 수동 번역 요청
router.post('/:id/translate', authMiddleware, translateHospital);

// POST /api/hospitals/:id/treatments/:treatmentId/translate — 시술 정보 수동 번역 요청
router.post('/:id/treatments/:treatmentId/translate', authMiddleware, translateTreatment);

module.exports = router;
