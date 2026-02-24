-- ============================================================
-- 004_create_reservations.sql — 예약 테이블
-- ============================================================
-- 실행 방법:
--   psql -U postgres -d beautycare -f database/migrations/004_create_reservations.sql
-- 사전 조건: 001, 002 실행 완료
-- ============================================================

-- 예약 상태 ENUM
CREATE TYPE reservation_status AS ENUM (
    'PENDING',      -- 예약 대기
    'CONFIRMED',    -- 예약 확정
    'CANCELLED',    -- 예약 취소
    'DONE'          -- 시술 완료
);

-- 예약 테이블 생성
CREATE TABLE IF NOT EXISTS reservations (
    reservation_id  BIGSERIAL           PRIMARY KEY,
    hospital_id     BIGINT              NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    user_id         BIGINT              NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    treatment_name  VARCHAR(200)        NOT NULL,
    reserved_at     TIMESTAMPTZ         NOT NULL,
    status          reservation_status  NOT NULL DEFAULT 'PENDING',
    -- 환자가 남기는 요청 메모
    memo            TEXT,
    -- 직원이 남기는 내부 메모 (환자에게 비공개)
    staff_memo      TEXT,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- 사용자별 예약 조회 인덱스
CREATE INDEX idx_reservations_user ON reservations (user_id, reserved_at DESC);

-- 병원별 예약 조회 인덱스
CREATE INDEX idx_reservations_hospital ON reservations (hospital_id, reserved_at DESC);

-- 상태별 필터링 인덱스
CREATE INDEX idx_reservations_status ON reservations (status);

-- updated_at 트리거
CREATE TRIGGER trg_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- reviews 테이블에 reservation_id FK 추가 (순환 참조 방지를 위해 여기서 추가)
ALTER TABLE reviews
    ADD CONSTRAINT fk_reviews_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
    ON DELETE SET NULL;

COMMENT ON TABLE reservations IS '시술 예약';
COMMENT ON COLUMN reservations.status IS '예약 상태: PENDING→CONFIRMED→DONE 또는 CANCELLED';
COMMENT ON COLUMN reservations.memo IS '환자 요청 메모 (환자 작성)';
COMMENT ON COLUMN reservations.staff_memo IS '직원 내부 메모 (환자 비공개)';
COMMENT ON COLUMN reservations.reserved_at IS '예약 날짜/시간';
