/**
 * 예약 라우트
 * 예약 CRUD 엔드포인트를 정의한다.
 */
const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  getReservations,
  getReservation,
  createReservation,
  cancelReservation,
  updateReservationStatus,
} = require('../controllers/reservationController');

const router = express.Router();

// 예약 생성 유효성 검사 규칙
const reservationValidation = [
  body('hospital_id').isInt().withMessage('병원 ID를 입력해주세요'),
  body('treatment_name').notEmpty().withMessage('시술명을 입력해주세요'),
  body('reserved_at').isISO8601().withMessage('유효한 예약 날짜를 입력해주세요'),
];

// 모든 예약 라우트는 인증 필요
router.use(authMiddleware);

// GET /api/reservations - 예약 목록 조회
router.get('/', getReservations);

// GET /api/reservations/:id - 예약 상세 조회
router.get('/:id', getReservation);

// POST /api/reservations - 예약 생성
router.post('/', reservationValidation, validate, createReservation);

// PATCH /api/reservations/:id/cancel - 예약 취소
router.patch('/:id/cancel', cancelReservation);

// PATCH /api/reservations/:id/status - 예약 상태 변경 (병원 소유자 전용)
router.patch('/:id/status', updateReservationStatus);

module.exports = router;
