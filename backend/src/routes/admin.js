/**
 * 관리자 라우트 (SUPER_ADMIN 전용)
 *
 * 모든 엔드포인트는 인증 + SUPER_ADMIN 권한 필요:
 *   GET  /api/admin/hospitals             — 병원 목록
 *   GET  /api/admin/users                 — 사용자 목록
 *   PUT  /api/admin/users/:id/role        — 사용자 역할 변경
 *   GET  /api/admin/contents/pending      — 승인 대기 콘텐츠
 *   PUT  /api/admin/contents/:id/approve  — 콘텐츠 승인
 *   PUT  /api/admin/contents/:id/reject   — 콘텐츠 거절
 *   GET  /api/admin/stats                 — 전체 통계
 */
const express = require('express');
const authMiddleware = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleAuth');
const {
  getHospitals,
  getUsers,
  updateUserRole,
  getPendingContents,
  approveContent,
  rejectContent,
  getStats,
} = require('../controllers/admin');

const router = express.Router();

// 모든 라우트에 인증 + SUPER_ADMIN 권한 필요
router.use(authMiddleware);
router.use(requireRole('SUPER_ADMIN'));

// ─── 병원 관리 ──────────────────────────────────────
router.get('/hospitals', getHospitals);

// ─── 사용자 관리 ────────────────────────────────────
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);

// ─── 콘텐츠 승인 관리 ──────────────────────────────
router.get('/contents/pending', getPendingContents);
router.put('/contents/:id/approve', approveContent);
router.put('/contents/:id/reject', rejectContent);

// ─── 통계 ───────────────────────────────────────────
router.get('/stats', getStats);

module.exports = router;
