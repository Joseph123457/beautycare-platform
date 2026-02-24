/**
 * Socket.io 채팅 이벤트 핸들러
 *
 * 연결 흐름:
 *   1) 클라이언트가 JWT 토큰과 함께 소켓 연결
 *   2) 연결 시 사용자 인증 → Redis에 온라인 상태 저장
 *   3) 채팅방 입장 → 메시지 송수신 → 읽음 처리
 *   4) 연결 해제 → Redis에서 온라인 상태 제거
 *
 * 이벤트:
 *   - join_room     : 채팅방 입장
 *   - send_message  : 메시지 전송 (텍스트 또는 이미지)
 *   - mark_read     : 메시지 읽음 처리
 *   - typing        : 타이핑 표시
 *   - disconnect    : 연결 해제
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Chat = require('../models/chat');
const Hospital = require('../models/hospital');

// Redis 클라이언트 (온라인 상태 관리용)
let redisClient = null;

/**
 * Redis 클라이언트 초기화
 * 서버 시작 시 한 번만 호출한다.
 */
const initRedis = async () => {
  try {
    const { createClient } = require('redis');
    redisClient = createClient({
      socket: {
        host: env.redis.host,
        port: env.redis.port,
      },
      password: env.redis.password || undefined,
    });

    redisClient.on('error', (err) => {
      console.error('Redis 연결 에러:', err.message);
    });

    await redisClient.connect();
    console.log('Redis 연결 성공 (채팅 온라인 상태 관리)');
  } catch (error) {
    console.error('Redis 초기화 실패:', error.message);
    // Redis 없이도 채팅 기본 기능은 동작하도록 fallback
  }
};

/**
 * JWT 토큰으로 소켓 연결 인증
 * @param {object} socket - Socket.io 소켓 객체
 * @param {function} next - 미들웨어 next
 */
const authenticateSocket = (socket, next) => {
  try {
    // 클라이언트에서 auth.token으로 JWT 전달
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('인증 토큰이 필요합니다'));
    }

    // JWT 검증
    const decoded = jwt.verify(token, env.jwt.secret);
    if (decoded.type !== 'access') {
      return next(new Error('유효하지 않은 토큰 타입입니다'));
    }

    // 소켓에 사용자 정보 저장
    socket.user = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('토큰이 만료되었습니다'));
    }
    return next(new Error('인증에 실패했습니다'));
  }
};

/**
 * 사용자 온라인 상태 설정 (Redis)
 * @param {number} userId - 사용자 ID
 * @param {boolean} online - 온라인 여부
 */
const setOnlineStatus = async (userId, online) => {
  if (!redisClient) return;
  try {
    if (online) {
      // 온라인 상태를 30분 TTL로 저장
      await redisClient.set(`user:online:${userId}`, '1', { EX: 1800 });
    } else {
      await redisClient.del(`user:online:${userId}`);
    }
  } catch (error) {
    console.error('Redis 온라인 상태 설정 실패:', error.message);
  }
};

/**
 * 사용자 온라인 상태 조회 (Redis)
 * @param {number} userId - 사용자 ID
 * @returns {boolean} 온라인 여부
 */
const getOnlineStatus = async (userId) => {
  if (!redisClient) return false;
  try {
    const result = await redisClient.get(`user:online:${userId}`);
    return result === '1';
  } catch {
    return false;
  }
};

/**
 * Socket.io 이벤트 핸들러 등록
 * @param {object} io - Socket.io 서버 인스턴스
 */
const setupChatHandlers = (io) => {
  // 인증 미들웨어 등록
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`소켓 연결: 사용자 ${userId}`);

    // 온라인 상태 설정
    await setOnlineStatus(userId, true);

    // ─── 채팅방 입장 ────────────────────────────────────
    socket.on('join_room', async ({ room_id }, callback) => {
      try {
        // 채팅방 존재 및 접근 권한 확인
        const room = await Chat.findRoomById(room_id);
        if (!room) {
          return callback?.({ error: '채팅방을 찾을 수 없습니다' });
        }

        // 참여자 확인 (병원 소유자 또는 해당 환자만 접근 가능)
        const hospital = await Hospital.findById(room.hospital_id);
        const isHospitalOwner = hospital?.owner_user_id === userId;
        const isPatient = room.user_id === userId;

        if (!isHospitalOwner && !isPatient) {
          return callback?.({ error: '이 채팅방에 접근할 수 없습니다' });
        }

        // 소켓 룸 입장
        socket.join(`room:${room_id}`);

        // 읽음 처리
        const readerType = isHospitalOwner ? 'HOSPITAL' : 'USER';
        await Chat.markAsRead(room_id, readerType);

        // 상대방에게 읽음 알림 전송
        socket.to(`room:${room_id}`).emit('messages_read', {
          room_id,
          reader_type: readerType,
        });

        callback?.({ success: true, room });
      } catch (error) {
        console.error('채팅방 입장 에러:', error.message);
        callback?.({ error: '채팅방 입장에 실패했습니다' });
      }
    });

    // ─── 메시지 전송 ────────────────────────────────────
    socket.on('send_message', async ({ room_id, content, image_url }, callback) => {
      try {
        // 입력 검증
        if (!room_id || (!content && !image_url)) {
          return callback?.({ error: '메시지 내용이 필요합니다' });
        }

        // 채팅방 접근 권한 확인
        const room = await Chat.findRoomById(room_id);
        if (!room) {
          return callback?.({ error: '채팅방을 찾을 수 없습니다' });
        }

        const hospital = await Hospital.findById(room.hospital_id);
        const isHospitalOwner = hospital?.owner_user_id === userId;
        const isPatient = room.user_id === userId;

        if (!isHospitalOwner && !isPatient) {
          return callback?.({ error: '이 채팅방에 메시지를 보낼 수 없습니다' });
        }

        const senderType = isHospitalOwner ? 'HOSPITAL' : 'USER';

        // 메시지 저장
        const message = await Chat.createMessage({
          room_id,
          sender_id: userId,
          sender_type: senderType,
          content,
          image_url,
        });

        // 채팅방 마지막 메시지 업데이트
        await Chat.updateRoomLastMessage(room_id, content, senderType);

        // 같은 방의 모든 사용자에게 메시지 브로드캐스트
        io.to(`room:${room_id}`).emit('new_message', {
          ...message,
          room_id,
        });

        callback?.({ success: true, message });
      } catch (error) {
        console.error('메시지 전송 에러:', error.message);
        callback?.({ error: '메시지 전송에 실패했습니다' });
      }
    });

    // ─── 메시지 읽음 처리 ───────────────────────────────
    socket.on('mark_read', async ({ room_id }, callback) => {
      try {
        const room = await Chat.findRoomById(room_id);
        if (!room) {
          return callback?.({ error: '채팅방을 찾을 수 없습니다' });
        }

        const hospital = await Hospital.findById(room.hospital_id);
        const isHospitalOwner = hospital?.owner_user_id === userId;
        const readerType = isHospitalOwner ? 'HOSPITAL' : 'USER';

        await Chat.markAsRead(room_id, readerType);

        // 상대방에게 읽음 알림
        socket.to(`room:${room_id}`).emit('messages_read', {
          room_id,
          reader_type: readerType,
        });

        callback?.({ success: true });
      } catch (error) {
        console.error('읽음 처리 에러:', error.message);
        callback?.({ error: '읽음 처리에 실패했습니다' });
      }
    });

    // ─── 타이핑 표시 ────────────────────────────────────
    socket.on('typing', ({ room_id, is_typing }) => {
      socket.to(`room:${room_id}`).emit('user_typing', {
        room_id,
        user_id: userId,
        is_typing,
      });
    });

    // ─── 연결 해제 ──────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`소켓 해제: 사용자 ${userId}`);
      await setOnlineStatus(userId, false);
    });
  });
};

module.exports = { setupChatHandlers, initRedis, getOnlineStatus };
