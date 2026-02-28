/**
 * 피드 라우트
 *
 * 공개 엔드포인트:
 *   GET /api/feed          — 피드 목록 (랜덤 정렬, 카테고리/위치 필터)
 *   GET /api/feed/:id      — 피드 상세 조회
 *
 * 인증 필요 (HOSPITAL_ADMIN):
 *   GET    /api/feed/hospital/mine — 내 병원 콘텐츠 목록
 *   POST   /api/feed               — 피드 콘텐츠 생성 (사진 업로드)
 *   PUT    /api/feed/:id           — 피드 콘텐츠 수정
 *   DELETE /api/feed/:id           — 피드 콘텐츠 삭제
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const authMiddleware = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleAuth');
const { uploadPhotos } = require('../middlewares/upload');
const {
  getFeed,
  getDetail,
  create,
  update,
  deleteFeed,
  getMyContents,
} = require('../controllers/feed');

const router = express.Router();

/**
 * 선택적 인증 미들웨어
 * 토큰이 있으면 req.user를 설정하고, 없어도 통과시킨다.
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret);

    if (decoded.type === 'access') {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    }
  } catch (error) {
    // 토큰 검증 실패해도 통과 (공개 API이므로)
  }
  next();
};

// ─── 공개 라우트 ─────────────────────────────────────

// GET /api/feed — 피드 목록 조회
router.get('/', getFeed);

// ─── HOSPITAL_ADMIN 전용 라우트 ──────────────────────
// 주의: /hospital/mine은 /:id 보다 먼저 정의해야 라우트 충돌 방지
router.get('/hospital/mine', authMiddleware, requireRole('HOSPITAL_ADMIN'), getMyContents);

// GET /api/feed/:id — 피드 상세 조회 (선택적 인증)
router.get('/:id', optionalAuth, getDetail);

// POST /api/feed — 피드 콘텐츠 생성
router.post('/', authMiddleware, requireRole('HOSPITAL_ADMIN'), uploadPhotos, create);

// PUT /api/feed/:id — 피드 콘텐츠 수정
router.put('/:id', authMiddleware, requireRole('HOSPITAL_ADMIN'), update);

// DELETE /api/feed/:id — 피드 콘텐츠 삭제
router.delete('/:id', authMiddleware, requireRole('HOSPITAL_ADMIN'), deleteFeed);

module.exports = router;
