-- ============================================================
-- 009_add_review_reply_columns.sql — 리뷰 답변 컬럼 추가
-- ============================================================
-- 실행 방법:
--   psql -U postgres -d beautycare -f database/migrations/009_add_review_reply_columns.sql
-- 사전 조건: 003 실행 완료
-- ============================================================

-- 병원 관리자의 공개 답변
ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS reply_content TEXT,
    ADD COLUMN IF NOT EXISTS replied_at    TIMESTAMPTZ;

COMMENT ON COLUMN reviews.reply_content IS '병원 관리자의 공개 답변 내용';
COMMENT ON COLUMN reviews.replied_at IS '답변 작성 시각';
