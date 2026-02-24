/**
 * 병원 컨트롤러
 * 병원 목록/상세/등록/수정/삭제 로직을 처리한다.
 */
const Hospital = require('../models/hospital');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * 병원 목록 조회
 * GET /api/hospitals
 */
const getHospitals = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const hospitals = await Hospital.findAll(Number(limit), Number(offset));
    return successResponse(res, hospitals, '병원 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * 병원 상세 조회
 * GET /api/hospitals/:id
 */
const getHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return errorResponse(res, '병원을 찾을 수 없습니다', 404);
    }
    return successResponse(res, hospital, '병원 상세 조회 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * 병원 등록
 * POST /api/hospitals
 */
const createHospital = async (req, res, next) => {
  try {
    const { name, address, category, description, lat, lng } = req.body;
    const hospital = await Hospital.create({
      name,
      address,
      category,
      description,
      lat,
      lng,
      owner_user_id: req.user.id,
    });
    return successResponse(res, hospital, '병원이 등록되었습니다', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 병원 정보 수정
 * PUT /api/hospitals/:id
 */
const updateHospital = async (req, res, next) => {
  try {
    const { name, address, category, description } = req.body;
    const hospital = await Hospital.update(req.params.id, {
      name,
      address,
      category,
      description,
    });
    if (!hospital) {
      return errorResponse(res, '병원을 찾을 수 없습니다', 404);
    }
    return successResponse(res, hospital, '병원 정보가 수정되었습니다');
  } catch (error) {
    next(error);
  }
};

/**
 * 병원 삭제
 * DELETE /api/hospitals/:id
 */
const deleteHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.delete(req.params.id);
    if (!hospital) {
      return errorResponse(res, '병원을 찾을 수 없습니다', 404);
    }
    return successResponse(res, null, '병원이 삭제되었습니다');
  } catch (error) {
    next(error);
  }
};

module.exports = { getHospitals, getHospital, createHospital, updateHospital, deleteHospital };
