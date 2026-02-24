/**
 * 환자 CRM 라우트
 * 병원 대시보드에서 환자 관리 API 엔드포인트를 정의한다.
 */
const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const { requireBasic, requirePro } = require('../middlewares/subscription');
const validate = require('../middlewares/validate');
const {
  getPatients,
  getPatientDetail,
  saveMemo,
  bulkMessage,
} = require('../controllers/patients');

const router = express.Router();

// 메모 저장 유효성 검사 규칙
const memoValidation = [
  body('content').notEmpty().withMessage('메모 내용을 입력해주세요'),
];

// 단체 메시지 유효성 검사 규칙
const bulkMessageValidation = [
  body('target')
    .isIn(['all', 'treatment', 'inactive'])
    .withMessage('대상 유형을 선택해주세요 (all, treatment, inactive)'),
  body('channel')
    .isIn(['push', 'alimtalk'])
    .withMessage('발송 채널을 선택해주세요 (push, alimtalk)'),
  body('title').notEmpty().withMessage('메시지 제목을 입력해주세요'),
  body('body').notEmpty().withMessage('메시지 본문을 입력해주세요'),
];

// 모든 환자 CRM 라우트는 인증 필요
router.use(authMiddleware);

// GET /api/patients - 환자 목록 조회 (BASIC 이상)
router.get('/', requireBasic, getPatients);

// GET /api/patients/:user_id - 환자 상세 조회 (BASIC 이상)
router.get('/:user_id', requireBasic, getPatientDetail);

// PATCH /api/patients/:user_id/memo - 메모 저장 (BASIC 이상)
router.patch('/:user_id/memo', requireBasic, memoValidation, validate, saveMemo);

// POST /api/patients/bulk-message - 단체 메시지 발송 (PRO 전용)
router.post('/bulk-message', requirePro, bulkMessageValidation, validate, bulkMessage);

module.exports = router;
