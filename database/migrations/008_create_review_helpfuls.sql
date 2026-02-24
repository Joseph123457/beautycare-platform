-- ============================================================
-- 008_create_review_helpfuls.sql — 리뷰 '도움이 돼요' 기록 테이블
-- ============================================================
-- 같은 사용자가 같은 리뷰에 중복 클릭하는 것을 방지한다.
-- (review_id, user_id) 복합 기본키로 유니크 보장.
-- ============================================================

CREATE TABLE IF NOT EXISTS review_helpfuls (
    review_id   BIGINT      NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
    user_id     BIGINT      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (review_id, user_id)
);

-- 사용자별 '도움이 돼요' 이력 조회
CREATE INDEX IF NOT EXISTS idx_review_helpfuls_user
    ON review_helpfuls (user_id);

COMMENT ON TABLE review_helpfuls IS '리뷰 "도움이 돼요" 클릭 기록 (중복 방지)';
