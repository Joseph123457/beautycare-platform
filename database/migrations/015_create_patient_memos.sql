-- 환자 CRM 메모 테이블
CREATE TABLE IF NOT EXISTS patient_memos (
    memo_id         BIGSERIAL       PRIMARY KEY,
    hospital_id     BIGINT          NOT NULL REFERENCES hospitals(hospital_id),
    user_id         BIGINT          NOT NULL REFERENCES users(user_id),
    content         TEXT            NOT NULL,
    created_by      VARCHAR(100),   -- 작성자 이름
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 인덱스: 병원별 환자 메모 조회
CREATE INDEX IF NOT EXISTS idx_patient_memos_hospital_user ON patient_memos(hospital_id, user_id);

-- 인덱스: 병원별 최신 메모 조회
CREATE INDEX IF NOT EXISTS idx_patient_memos_hospital_created ON patient_memos(hospital_id, created_at DESC);

COMMENT ON TABLE patient_memos IS '병원 대시보드 환자 CRM 메모';
COMMENT ON COLUMN patient_memos.created_by IS '메모 작성자 이름 (병원 직원)';
