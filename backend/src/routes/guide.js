/**
 * 의료관광 가이드 라우트
 * 가이드 아티클·회복 숙소·체크리스트 엔드포인트를 정의한다.
 * 모든 엔드포인트는 공개 API (인증 불필요)
 */
const express = require('express');
const {
  getArticles,
  getArticleById,
  getRecoveryHouses,
  getChecklist,
} = require('../controllers/guide');

const router = express.Router();

// GET /api/guide/articles — 가이드 아티클 목록
router.get('/articles', getArticles);

// GET /api/guide/articles/:id — 가이드 아티클 상세
router.get('/articles/:id', getArticleById);

// GET /api/guide/recovery-houses — 회복 숙소 목록
router.get('/recovery-houses', getRecoveryHouses);

// GET /api/guide/checklist — 의료관광 체크리스트
router.get('/checklist', getChecklist);

module.exports = router;
