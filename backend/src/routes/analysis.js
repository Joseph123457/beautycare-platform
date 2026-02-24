/**
 * AI 분석 라우트
 *
 * 인증 + BASIC 구독 이상 필요:
 *   POST /monthly-report  — 월간 리포트 생성/조회
 *   GET  /keywords/:hospital_id — 키워드 트렌드 조회
 */
const express = require('express');
const authMiddleware = require('../middlewares/auth');
const { requireBasic } = require('../middlewares/subscription');
const { generateReport, getKeywords } = require('../controllers/analysis');

const router = express.Router();

// POST /api/analysis/monthly-report — 월간 리포트 생성/조회
router.post('/monthly-report', authMiddleware, requireBasic, generateReport);

// GET /api/analysis/keywords/:hospital_id — 키워드 트렌드 조회
router.get('/keywords/:hospital_id', authMiddleware, requireBasic, getKeywords);

module.exports = router;
