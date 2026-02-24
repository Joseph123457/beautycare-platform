-- ============================================================
-- 005_create_subscriptions.sql — 구독 테이블
-- ============================================================
-- 실행 방법:
--   psql -U postgres -d beautycare -f database/migrations/005_create_subscriptions.sql
-- 사전 조건: 002_create_hospitals.sql 실행 완료
-- ============================================================

-- 구독 테이블 생성
CREATE TABLE IF NOT EXISTS subscriptions (
    sub_id          BIGSERIAL           PRIMARY KEY,
    hospital_id     BIGINT              NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    -- 구독 등급 (002에서 생성한 subscription_tier ENUM 재사용)
    tier            subscription_tier   NOT NULL DEFAULT 'FREE',
    -- 월 구독 가격 (원 단위)
    price           INTEGER             NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ         NOT NULL,
    -- 자동 갱신 여부
    auto_renew      BOOLEAN             NOT NULL DEFAULT true,
    -- 결제 수단 (예: 'toss_card', 'toss_transfer')
    payment_method  VARCHAR(100),
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- 병원별 구독 이력 조회
CREATE INDEX idx_subscriptions_hospital ON subscriptions (hospital_id, started_at DESC);

-- 만료 예정 구독 조회 (자동 갱신 배치용)
CREATE INDEX idx_subscriptions_expires
    ON subscriptions (expires_at)
    WHERE auto_renew = true;

-- updated_at 트리거
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE subscriptions IS '병원 구독 이력';
COMMENT ON COLUMN subscriptions.tier IS '구독 등급: FREE/BASIC/PRO';
COMMENT ON COLUMN subscriptions.price IS '월 구독 가격 (원 단위)';
COMMENT ON COLUMN subscriptions.auto_renew IS '자동 갱신 여부';
COMMENT ON COLUMN subscriptions.payment_method IS '결제 수단 (토스페이먼츠 기반)';
