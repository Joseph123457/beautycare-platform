/**
 * 채팅 라우트
 *
 * 인증 필요 엔드포인트:
 *   GET  /              — 내 채팅방 목록
 *   GET  /:room_id/messages — 채팅 내역 조회
 *   POST /start         — 새 채팅 시작
 *
 * 실시간 메시지 송수신은 Socket.io로 처리 (socket/chat.js 참고)
 */
const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { getChatRooms, getMessages, startChat } = require('../controllers/chats');

const router = express.Router();

// ─── 새 채팅 시작 유효성 검사 ────────────────────────────
const startValidation = [
  body('hospital_id')
    .isInt({ min: 1 }).withMessage('유효한 병원 ID를 입력해주세요'),
];

// 모든 채팅 라우트는 인증 필요
router.use(authMiddleware);

// GET /api/chats — 내 채팅방 목록
router.get('/', getChatRooms);

// GET /api/chats/:room_id/messages — 채팅 내역 조회
router.get('/:room_id/messages', getMessages);

// POST /api/chats/start — 새 채팅 시작
router.post('/start', startValidation, validate, startChat);

module.exports = router;
