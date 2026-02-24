/**
 * 채팅 REST API 컨트롤러
 *
 * 채팅 목록·내역 조회 등 소켓이 아닌 HTTP 요청을 처리한다.
 *
 * 엔드포인트:
 *   GET  /api/chats              — 내 채팅방 목록
 *   GET  /api/chats/:room_id/messages — 채팅 내역 조회
 *   POST /api/chats/start        — 새 채팅 시작
 */
const Chat = require('../models/chat');
const Hospital = require('../models/hospital');
const { getOnlineStatus } = require('../socket/chat');
const { successResponse, errorResponse } = require('../utils/response');

// ─── 1. 내 채팅방 목록 조회 ─────────────────────────────

/**
 * GET /api/chats
 *
 * 인증 필수
 * - 병원 소유자: 모든 환자와의 채팅방 + 읽지 않은 메시지 수
 * - 일반 환자: 문의한 병원 목록
 */
const getChatRooms = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 병원 소유자인지 확인
    const hospital = await Hospital.findByOwnerId(userId);

    let rooms;
    if (hospital) {
      // 병원 소유자: 병원에 들어온 모든 채팅방
      rooms = await Chat.findRoomsByHospitalId(hospital.hospital_id);

      // 각 환자의 온라인 상태 추가
      rooms = await Promise.all(
        rooms.map(async (room) => ({
          ...room,
          user_online: await getOnlineStatus(room.user_id),
        }))
      );
    } else {
      // 일반 환자: 내가 문의한 병원 채팅방
      rooms = await Chat.findRoomsByUserId(userId);

      // 각 병원 소유자의 온라인 상태 추가
      rooms = await Promise.all(
        rooms.map(async (room) => {
          const h = await Hospital.findById(room.hospital_id);
          return {
            ...room,
            hospital_online: h ? await getOnlineStatus(h.owner_user_id) : false,
          };
        })
      );
    }

    return successResponse(res, { rooms, is_hospital: !!hospital }, '채팅방 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

// ─── 2. 채팅 내역 조회 ──────────────────────────────────

/**
 * GET /api/chats/:room_id/messages
 *
 * 인증 필수
 * 쿼리: ?page=1&limit=20
 * - 페이지네이션 (최신 20개씩)
 * - 조회 시 자동으로 읽음 처리
 */
const getMessages = async (req, res, next) => {
  try {
    const { room_id } = req.params;
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    // 채팅방 존재 확인
    const room = await Chat.findRoomById(room_id);
    if (!room) {
      return errorResponse(res, '채팅방을 찾을 수 없습니다', 404);
    }

    // 접근 권한 확인
    const hospital = await Hospital.findById(room.hospital_id);
    const isHospitalOwner = hospital?.owner_user_id === userId;
    const isPatient = room.user_id === userId;

    if (!isHospitalOwner && !isPatient) {
      return errorResponse(res, '이 채팅방에 접근할 수 없습니다', 403);
    }

    // 메시지 조회
    const messages = await Chat.findMessages(room_id, limit, offset);

    // 읽음 처리 자동 적용
    const readerType = isHospitalOwner ? 'HOSPITAL' : 'USER';
    await Chat.markAsRead(room_id, readerType);

    return successResponse(res, {
      messages,
      page,
      limit,
    }, '채팅 내역 조회 성공');
  } catch (error) {
    next(error);
  }
};

// ─── 3. 새 채팅 시작 ────────────────────────────────────

/**
 * POST /api/chats/start
 *
 * 인증 필수 (환자)
 * 요청 body: { hospital_id }
 * - 환자가 병원에 첫 문의 시 채팅방 생성
 * - 이미 존재하는 채팅방이면 기존 room_id 반환
 */
const startChat = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { hospital_id } = req.body;

    if (!hospital_id) {
      return errorResponse(res, '병원 ID가 필요합니다', 400);
    }

    // 병원 존재 확인
    const hospital = await Hospital.findById(hospital_id);
    if (!hospital) {
      return errorResponse(res, '병원을 찾을 수 없습니다', 404);
    }

    // PRO 플랜 확인 (채팅은 PRO 병원만 가능)
    if (hospital.subscription_tier !== 'PRO') {
      return errorResponse(res, '이 병원은 채팅 기능을 지원하지 않습니다', 403);
    }

    // 자기 자신의 병원에 채팅 방지
    if (hospital.owner_user_id === userId) {
      return errorResponse(res, '자신의 병원에는 채팅을 시작할 수 없습니다', 400);
    }

    // 채팅방 생성 (이미 존재하면 기존 반환)
    const room = await Chat.findOrCreateRoom(hospital_id, userId);

    return successResponse(res, { room }, '채팅방이 준비되었습니다', 201);
  } catch (error) {
    next(error);
  }
};

module.exports = { getChatRooms, getMessages, startChat };
