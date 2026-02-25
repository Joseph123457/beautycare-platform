/**
 * 병원 통계 분석 라우트
 *
 * 인증 + BASIC 구독 이상 필요:
 *   GET /overview/:hospital_id   — 전체 현황 (기간별)
 *   GET /treatments/:hospital_id — 시술별 분석
 *   GET /time/:hospital_id       — 시간대별 분석
 *   GET /exposure/:hospital_id   — 노출 분석
 */
const express = require('express');
const authMiddleware = require('../middlewares/auth');
const { requireBasic } = require('../middlewares/subscription');
const {
  getOverview,
  getTreatments,
  getTimeAnalysis,
  getExposure,
} = require('../controllers/analytics');

const router = express.Router();

// 모든 통계 라우트는 인증 + BASIC 구독 이상 필요
router.use(authMiddleware, requireBasic);

// GET /api/analytics/overview/:hospital_id — 전체 현황
router.get('/overview/:hospital_id', getOverview);

// GET /api/analytics/treatments/:hospital_id — 시술별 분석
router.get('/treatments/:hospital_id', getTreatments);

// GET /api/analytics/time/:hospital_id — 시간대별 분석
router.get('/time/:hospital_id', getTimeAnalysis);

// GET /api/analytics/exposure/:hospital_id — 노출 분석
router.get('/exposure/:hospital_id', getExposure);

module.exports = router;
