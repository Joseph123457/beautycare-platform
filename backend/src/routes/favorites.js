/**
 * 즐겨찾기 라우트
 *
 * 모든 엔드포인트는 인증 필요:
 *   GET    /api/favorites              — 내 즐겨찾기 목록
 *   POST   /api/favorites/:contentId   — 즐겨찾기 추가
 *   DELETE /api/favorites/:contentId   — 즐겨찾기 삭제
 */
const express = require('express');
const authMiddleware = require('../middlewares/auth');
const {
  addFavorite,
  removeFavorite,
  getMyFavorites,
} = require('../controllers/favorites');

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

// GET /api/favorites — 내 즐겨찾기 목록
router.get('/', getMyFavorites);

// POST /api/favorites/:contentId — 즐겨찾기 추가
router.post('/:contentId', addFavorite);

// DELETE /api/favorites/:contentId — 즐겨찾기 삭제
router.delete('/:contentId', removeFavorite);

module.exports = router;
