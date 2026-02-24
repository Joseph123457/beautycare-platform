/**
 * 채팅 모델
 * 채팅방 및 메시지 관련 데이터베이스 쿼리를 처리한다.
 */
const { pool } = require('../config/database');

const Chat = {
  // ─── 채팅방 관련 ──────────────────────────────────────

  /**
   * 병원+환자 조합으로 채팅방 조회
   * @param {number} hospitalId - 병원 ID
   * @param {number} userId - 환자 ID
   */
  findRoom: async (hospitalId, userId) => {
    const result = await pool.query(
      'SELECT * FROM chat_rooms WHERE hospital_id = $1 AND user_id = $2',
      [hospitalId, userId]
    );
    return result.rows[0] || null;
  },

  /**
   * 채팅방 ID로 조회
   * @param {number} roomId - 채팅방 ID
   */
  findRoomById: async (roomId) => {
    const result = await pool.query(
      'SELECT * FROM chat_rooms WHERE room_id = $1',
      [roomId]
    );
    return result.rows[0] || null;
  },

  /**
   * 채팅방 생성 (없으면 생성, 있으면 기존 반환)
   * @param {number} hospitalId - 병원 ID
   * @param {number} userId - 환자 ID
   */
  findOrCreateRoom: async (hospitalId, userId) => {
    const result = await pool.query(
      `INSERT INTO chat_rooms (hospital_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (hospital_id, user_id) DO UPDATE SET hospital_id = chat_rooms.hospital_id
       RETURNING *`,
      [hospitalId, userId]
    );
    return result.rows[0];
  },

  /**
   * 병원의 채팅방 목록 조회 (환자 이름 포함)
   * @param {number} hospitalId - 병원 ID
   */
  findRoomsByHospitalId: async (hospitalId) => {
    const result = await pool.query(
      `SELECT cr.*, u.name AS user_name, u.email AS user_email
       FROM chat_rooms cr
       JOIN users u ON cr.user_id = u.user_id
       WHERE cr.hospital_id = $1
       ORDER BY cr.last_message_at DESC NULLS LAST`,
      [hospitalId]
    );
    return result.rows;
  },

  /**
   * 환자의 채팅방 목록 조회 (병원 이름 포함)
   * @param {number} userId - 환자 ID
   */
  findRoomsByUserId: async (userId) => {
    const result = await pool.query(
      `SELECT cr.*, h.name AS hospital_name
       FROM chat_rooms cr
       JOIN hospitals h ON cr.hospital_id = h.hospital_id
       WHERE cr.user_id = $1
       ORDER BY cr.last_message_at DESC NULLS LAST`,
      [userId]
    );
    return result.rows;
  },

  // ─── 메시지 관련 ──────────────────────────────────────

  /**
   * 메시지 저장
   * @param {object} data - 메시지 데이터
   */
  createMessage: async ({ room_id, sender_id, sender_type, content, image_url }) => {
    const result = await pool.query(
      `INSERT INTO chat_messages (room_id, sender_id, sender_type, content, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [room_id, sender_id, sender_type, content || null, image_url || null]
    );
    return result.rows[0];
  },

  /**
   * 채팅방 메시지 목록 조회 (페이지네이션, 최신순)
   * @param {number} roomId - 채팅방 ID
   * @param {number} limit - 한 페이지 항목 수
   * @param {number} offset - 건너뛸 항목 수
   */
  findMessages: async (roomId, limit = 20, offset = 0) => {
    const result = await pool.query(
      `SELECT cm.*, u.name AS sender_name
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.user_id
       WHERE cm.room_id = $1
       ORDER BY cm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [roomId, limit, offset]
    );
    return result.rows;
  },

  /**
   * 채팅방의 마지막 메시지 및 안 읽은 카운터 업데이트
   * @param {number} roomId - 채팅방 ID
   * @param {string} content - 마지막 메시지 내용
   * @param {string} senderType - 발신자 타입 (HOSPITAL|USER)
   */
  updateRoomLastMessage: async (roomId, content, senderType) => {
    // 발신자 반대편의 unread_count 증가
    const unreadColumn = senderType === 'HOSPITAL'
      ? 'user_unread_count'
      : 'hospital_unread_count';

    await pool.query(
      `UPDATE chat_rooms
       SET last_message = $2,
           last_message_at = NOW(),
           ${unreadColumn} = ${unreadColumn} + 1
       WHERE room_id = $1`,
      [roomId, content || '[이미지]']
    );
  },

  /**
   * 읽음 처리: 특정 채팅방의 메시지를 모두 읽음으로 변경
   * @param {number} roomId - 채팅방 ID
   * @param {string} readerType - 읽는 사람 타입 (HOSPITAL|USER)
   */
  markAsRead: async (roomId, readerType) => {
    // 상대방이 보낸 메시지를 읽음 처리
    const senderType = readerType === 'HOSPITAL' ? 'USER' : 'HOSPITAL';

    await pool.query(
      `UPDATE chat_messages SET is_read = true
       WHERE room_id = $1 AND sender_type = $2 AND is_read = false`,
      [roomId, senderType]
    );

    // unread_count 초기화
    const unreadColumn = readerType === 'HOSPITAL'
      ? 'hospital_unread_count'
      : 'user_unread_count';

    await pool.query(
      `UPDATE chat_rooms SET ${unreadColumn} = 0 WHERE room_id = $1`,
      [roomId]
    );
  },
};

module.exports = Chat;
