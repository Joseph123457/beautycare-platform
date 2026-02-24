-- ============================================================
-- 010_create_payments.sql — 결제 내역 테이블
-- ============================================================
-- 실행 방법:
--   psql -U postgres -d beautycare -f database/migrations/010_create_payments.sql
-- 사전 조건: 002_create_hospitals.sql, 005_create_subscriptions.sql 실행 완료
-- ============================================================

-- 결제 상태 ENUM
CREATE TYPE payment_status AS ENUM ('SUCCESS', 'FAIL', 'CANCEL');

-- 결제 내역 테이블
CREATE TABLE IF NOT EXISTS payments (
    payment_id      BIGSERIAL           PRIMARY KEY,
    hospital_id     BIGINT              NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    sub_id          BIGINT              REFERENCES subscriptions(sub_id) ON DELETE SET NULL,
    -- 결제 금액 (원 단위)
    amount          INTEGER             NOT NULL,
    -- 결제 상태
    status          payment_status      NOT NULL DEFAULT 'SUCCESS',
    -- 토스페이먼츠 결제 키 (결제 조회·취소 시 사용)
    toss_payment_key VARCHAR(200),
    -- 토스페이먼츠 빌링키 (정기결제용)
    billing_key     VARCHAR(200),
    -- 결제 완료 시각
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- 병원별 결제 내역 조회
CREATE INDEX idx_payments_hospital ON payments (hospital_id, created_at DESC);

-- 구독별 결제 내역 조회
CREATE INDEX idx_payments_sub ON payments (sub_id);

-- 토스 결제키로 조회 (웹훅 수신 시)
CREATE INDEX idx_payments_toss_key ON payments (toss_payment_key);

COMMENT ON TABLE payments IS '결제 내역';
COMMENT ON COLUMN payments.amount IS '결제 금액 (원 단위)';
COMMENT ON COLUMN payments.toss_payment_key IS '토스페이먼츠 paymentKey';
COMMENT ON COLUMN payments.billing_key IS '토스페이먼츠 정기결제 빌링키';

-- subscriptions 테이블에 취소 관련 컬럼 추가
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS billing_key VARCHAR(200);
