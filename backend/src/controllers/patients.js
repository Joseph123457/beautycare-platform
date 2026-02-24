/**
 * 환자 CRM 컨트롤러
 * 병원 대시보드에서 환자 관리 기능을 처리한다.
 */
const Patient = require('../models/patient');
const { sendPushBulk } = require('../services/pushNotification');
const { sendAlimtalk } = require('../services/kakaoAlimtalk');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * 환자 목록 조회
 * GET /api/patients
 */
const getPatients = async (req, res, next) => {
  try {
    const hospitalId = req.hospital.hospital_id;
    const { search, sort, page = 1, limit = 20 } = req.query;

    const [patients, total] = await Promise.all([
      Patient.getPatients(hospitalId, {
        search,
        sort,
        page: Number(page),
        limit: Number(limit),
      }),
      Patient.countPatients(hospitalId, search),
    ]);

    return successResponse(res, {
      patients,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }, '환자 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * 환자 상세 조회
 * GET /api/patients/:user_id
 */
const getPatientDetail = async (req, res, next) => {
  try {
    const hospitalId = req.hospital.hospital_id;
    const userId = Number(req.params.user_id);

    const detail = await Patient.getPatientDetail(hospitalId, userId);
    if (!detail) {
      return errorResponse(res, '환자를 찾을 수 없습니다', 404);
    }

    return successResponse(res, detail, '환자 상세 조회 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * 환자 메모 저장
 * PATCH /api/patients/:user_id/memo
 */
const saveMemo = async (req, res, next) => {
  try {
    const hospitalId = req.hospital.hospital_id;
    const userId = Number(req.params.user_id);
    const { content } = req.body;

    // 작성자 이름: req.user.name이 있으면 사용, 없으면 이메일
    const createdBy = req.user.name || req.user.email;

    const memo = await Patient.addMemo(hospitalId, userId, content, createdBy);
    return successResponse(res, memo, '메모가 저장되었습니다', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 단체 메시지 발송
 * POST /api/patients/bulk-message
 */
const bulkMessage = async (req, res, next) => {
  try {
    const hospitalId = req.hospital.hospital_id;
    const { target, treatmentName, inactiveMonths, channel, title, body } = req.body;

    // 대상 환자 조회
    const targets = await Patient.getBulkTargets(hospitalId, {
      target,
      treatmentName,
      inactiveMonths,
    });

    if (targets.length === 0) {
      return errorResponse(res, '발송 대상 환자가 없습니다', 404);
    }

    let result = { success: 0, failed: 0 };

    if (channel === 'push') {
      // FCM 푸시 발송
      const userIds = targets.map((t) => t.user_id);
      result = await sendPushBulk(userIds, 'BULK_MESSAGE', title, body);
    } else if (channel === 'alimtalk') {
      // 카카오 알림톡 발송
      for (const t of targets) {
        if (!t.phone) {
          result.failed++;
          continue;
        }
        const res = await sendAlimtalk(
          t.user_id,
          t.phone,
          'BULK_MESSAGE',
          process.env.KAKAO_TPL_BULK_MESSAGE || 'TPL_BULK_MSG',
          { title, body, patientName: t.name },
          `[뷰티케어] ${title}\n${body}`,
          [],
          { hospitalId }
        );
        if (res.success) result.success++;
        else result.failed++;
      }
    } else {
      return errorResponse(res, '유효하지 않은 채널입니다 (push 또는 alimtalk)', 400);
    }

    return successResponse(res, {
      targetCount: targets.length,
      ...result,
    }, `단체 메시지 발송 완료: 성공 ${result.success}건, 실패 ${result.failed}건`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPatients,
  getPatientDetail,
  saveMemo,
  bulkMessage,
};
