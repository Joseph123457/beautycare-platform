-- push_logs에 발송 채널 컬럼 추가 (FCM / ALIMTALK / SMS 구분)
ALTER TABLE push_logs
  ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'FCM';

COMMENT ON COLUMN push_logs.channel IS '발송 채널: FCM, ALIMTALK, SMS';

-- 인덱스: 채널별 조회
CREATE INDEX IF NOT EXISTS idx_push_logs_channel ON push_logs(channel);
