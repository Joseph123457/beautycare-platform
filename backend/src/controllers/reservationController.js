/**
 * 예약 컨트롤러
 * 예약 생성/조회/취소 로직을 처리한다.
 */
const Reservation = require('../models/reservation');
const Hospital = require('../models/hospital');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * 예약 목록 조회 (본인 예약만)
 * GET /api/reservations
 */
const getReservations = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const reservations = await Reservation.findByUserId(
      req.user.id,
      Number(limit),
      Number(offset)
    );
    return successResponse(res, reservations, '예약 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * 예약 상세 조회
 * GET /api/reservations/:id
 */
const getReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return errorResponse(res, '예약을 찾을 수 없습니다', 404);
    }
    // 본인 예약만 조회 가능
    if (reservation.user_id !== req.user.id) {
      return errorResponse(res, '본인의 예약만 조회할 수 있습니다', 403);
    }
    return successResponse(res, reservation, '예약 상세 조회 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * 예약 생성
 * POST /api/reservations
 */
const createReservation = async (req, res, next) => {
  try {
    const { hospital_id, treatment_name, reserved_at, memo } = req.body;
    const reservation = await Reservation.create({
      user_id: req.user.id,
      hospital_id,
      treatment_name,
      reserved_at,
      memo,
    });
    return successResponse(res, reservation, '예약이 생성되었습니다', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 예약 취소
 * PATCH /api/reservations/:id/cancel
 */
const cancelReservation = async (req, res, next) => {
  try {
    // 예약 존재 및 본인 확인
    const existing = await Reservation.findById(req.params.id);
    if (!existing) {
      return errorResponse(res, '예약을 찾을 수 없습니다', 404);
    }
    if (existing.user_id !== req.user.id) {
      return errorResponse(res, '본인의 예약만 취소할 수 있습니다', 403);
    }

    const reservation = await Reservation.cancel(req.params.id);
    if (!reservation) {
      return errorResponse(res, '이미 취소되었거나 취소할 수 없는 예약입니다', 400);
    }
    return successResponse(res, reservation, '예약이 취소되었습니다');
  } catch (error) {
    next(error);
  }
};

/**
 * 병원의 예약 목록 조회 (병원 소유자 전용)
 * GET /api/hospitals/:id/reservations
 */
const getHospitalReservations = async (req, res, next) => {
  try {
    const hospitalId = req.params.id;

    // 병원 존재 확인 + 소유자 권한 검증
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return errorResponse(res, '병원을 찾을 수 없습니다', 404);
    }
    if (hospital.owner_user_id !== req.user.id) {
      return errorResponse(res, '해당 병원의 예약을 조회할 권한이 없습니다', 403);
    }

    const { status, date } = req.query;
    const reservations = await Reservation.findByHospitalId(hospitalId, { status, date });

    return successResponse(res, reservations, '병원 예약 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * 예약 상태 변경 (병원 소유자 전용)
 * PATCH /api/reservations/:id/status
 */
const updateReservationStatus = async (req, res, next) => {
  try {
    const reservationId = req.params.id;
    const { status: newStatus } = req.body;

    if (!newStatus) {
      return errorResponse(res, '변경할 상태를 입력해주세요', 400);
    }

    // 예약 존재 확인
    const existing = await Reservation.findById(reservationId);
    if (!existing) {
      return errorResponse(res, '예약을 찾을 수 없습니다', 404);
    }

    // 병원 소유자 권한 검증
    const hospital = await Hospital.findById(existing.hospital_id);
    if (!hospital || hospital.owner_user_id !== req.user.id) {
      return errorResponse(res, '해당 예약의 상태를 변경할 권한이 없습니다', 403);
    }

    // 상태 변경 (전이 규칙은 모델에서 적용)
    const updated = await Reservation.updateStatus(reservationId, newStatus);
    if (!updated) {
      return errorResponse(res, '해당 상태로 변경할 수 없습니다', 400);
    }

    return successResponse(res, updated, '예약 상태가 변경되었습니다');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReservations,
  getReservation,
  createReservation,
  cancelReservation,
  getHospitalReservations,
  updateReservationStatus,
};
