-- ============================================================
-- 003_create_reviews.sql — 리뷰 테이블
-- ============================================================
-- 실행 방법:
--   psql -U postgres -d beautycare -f database/migrations/003_create_reviews.sql
-- 사전 조건: 001, 002, 004 실행 완료 (reservation_id FK 참조)
--   단, 004와 순환 참조를 피하기 위해 FK는 나중에 추가하거나
--   reservation_id를 nullable FK로 설정
-- ============================================================

-- 리뷰 테이블 생성
CREATE TABLE IF NOT EXISTS reviews (
    review_id       BIGSERIAL       PRIMARY KEY,
    hospital_id     BIGINT          NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    user_id         BIGINT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    -- 예약 기반 리뷰 (예약 없이도 작성 가능하므로 nullable)
    reservation_id  BIGINT,
    -- 별점 1~5
    rating          SMALLINT        NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content         TEXT            NOT NULL,
    -- 리뷰 사진 URL 배열 (예: ["https://...jpg", "https://...png"])
    photo_urls      JSONB           DEFAULT '[]'::jsonb,
    -- 관리자 승인 후 공개 (기본값: 비공개)
    is_approved     BOOLEAN         NOT NULL DEFAULT false,
    -- 도움이 돼요 카운트
    helpful_count   INTEGER         NOT NULL DEFAULT 0,
    -- 랜덤 노출 알고리즘 대상 여부
    is_random_eligible BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 병원별 리뷰 조회 인덱스 (승인된 리뷰만 공개)
CREATE INDEX idx_reviews_hospital_approved
    ON reviews (hospital_id, is_approved)
    WHERE is_approved = true;

-- 사용자별 리뷰 조회 인덱스
CREATE INDEX idx_reviews_user ON reviews (user_id);

-- 랜덤 노출 대상 리뷰 인덱스
CREATE INDEX idx_reviews_random_eligible
    ON reviews (is_random_eligible)
    WHERE is_random_eligible = true AND is_approved = true;

-- 예약 기반 리뷰 조회
CREATE INDEX idx_reviews_reservation ON reviews (reservation_id)
    WHERE reservation_id IS NOT NULL;

-- updated_at 트리거
CREATE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE reviews IS '병원 리뷰 (관리자 승인 후 공개)';
COMMENT ON COLUMN reviews.is_approved IS '관리자 승인 여부 (true일 때만 공개)';
COMMENT ON COLUMN reviews.is_random_eligible IS '공정 노출 알고리즘 대상 여부';
COMMENT ON COLUMN reviews.helpful_count IS '"도움이 돼요" 클릭 수 (캐시)';
COMMENT ON COLUMN reviews.photo_urls IS '리뷰 사진 URL 배열 (JSON)';
