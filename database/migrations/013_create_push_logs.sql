-- 푸시 알림 발송 이력 테이블
CREATE TABLE IF NOT EXISTS push_logs (
    log_id          BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(user_id),
    type            VARCHAR(50)     NOT NULL,  -- 알림 유형: RESERVATION_CONFIRMED, RESERVATION_CANCELLED, RESERVATION_REMINDER, REVIEW_REQUEST, NEW_RESERVATION, NEW_REVIEW, UNANSWERED_CHAT
    title           VARCHAR(255)    NOT NULL,
    body            TEXT            NOT NULL,
    data            JSONB           DEFAULT '{}'::jsonb,  -- 추가 페이로드 (딥링크 등)
    status          VARCHAR(20)     NOT NULL DEFAULT 'SENT',  -- SENT, FAILED, DELIVERED
    error_message   TEXT,           -- 발송 실패 시 에러 내용
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 인덱스: 사용자별 알림 내역 조회
CREATE INDEX IF NOT EXISTS idx_push_logs_user_id ON push_logs(user_id);

-- 인덱스: 타입별 조회 (스케줄러 중복 방지)
CREATE INDEX IF NOT EXISTS idx_push_logs_type_created ON push_logs(type, created_at);

COMMENT ON TABLE push_logs IS '푸시 알림 발송 이력';
COMMENT ON COLUMN push_logs.type IS '알림 유형: RESERVATION_CONFIRMED, RESERVATION_CANCELLED, RESERVATION_REMINDER, REVIEW_REQUEST, NEW_RESERVATION, NEW_REVIEW, UNANSWERED_CHAT';
