-- ============================================================
-- 011_create_chat_tables.sql — 채팅 테이블
-- ============================================================
-- 실행 방법:
--   psql -U postgres -d beautycare -f database/migrations/011_create_chat_tables.sql
-- 사전 조건: 001_create_users.sql, 002_create_hospitals.sql 실행 완료
-- ============================================================

-- 메시지 발신자 타입 ENUM
CREATE TYPE sender_type AS ENUM ('HOSPITAL', 'USER');

-- ── 채팅방 테이블 ──
CREATE TABLE IF NOT EXISTS chat_rooms (
    room_id                 BIGSERIAL       PRIMARY KEY,
    hospital_id             BIGINT          NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    user_id                 BIGINT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    -- 마지막 메시지 미리보기 (목록 화면용)
    last_message            TEXT,
    last_message_at         TIMESTAMPTZ,
    -- 읽지 않은 메시지 카운터
    hospital_unread_count   INTEGER         NOT NULL DEFAULT 0,
    user_unread_count       INTEGER         NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 병원별 채팅방 목록 (최신 메시지 순)
CREATE INDEX idx_chat_rooms_hospital ON chat_rooms (hospital_id, last_message_at DESC);

-- 환자별 채팅방 목록
CREATE INDEX idx_chat_rooms_user ON chat_rooms (user_id, last_message_at DESC);

-- 병원+환자 조합으로 기존 채팅방 조회 (중복 방지)
CREATE UNIQUE INDEX idx_chat_rooms_pair ON chat_rooms (hospital_id, user_id);

-- ── 채팅 메시지 테이블 ──
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id      BIGSERIAL       PRIMARY KEY,
    room_id         BIGINT          NOT NULL REFERENCES chat_rooms(room_id) ON DELETE CASCADE,
    sender_id       BIGINT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    -- 발신자 타입: 병원(HOSPITAL) 또는 환자(USER)
    sender_type     sender_type     NOT NULL,
    -- 텍스트 내용 (이미지만 보낼 경우 NULL 가능)
    content         TEXT,
    -- 이미지 URL (S3 업로드 후 URL)
    image_url       VARCHAR(500),
    -- 읽음 여부
    is_read         BOOLEAN         NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 채팅방별 메시지 목록 (최신순 페이지네이션)
CREATE INDEX idx_chat_messages_room ON chat_messages (room_id, created_at DESC);

-- 읽지 않은 메시지 조회
CREATE INDEX idx_chat_messages_unread ON chat_messages (room_id, is_read) WHERE is_read = false;

COMMENT ON TABLE chat_rooms IS '병원-환자 1:1 채팅방';
COMMENT ON TABLE chat_messages IS '채팅 메시지';
COMMENT ON COLUMN chat_rooms.hospital_unread_count IS '병원 측 읽지 않은 메시지 수';
COMMENT ON COLUMN chat_rooms.user_unread_count IS '환자 측 읽지 않은 메시지 수';
COMMENT ON COLUMN chat_messages.sender_type IS '발신자 타입: HOSPITAL 또는 USER';
