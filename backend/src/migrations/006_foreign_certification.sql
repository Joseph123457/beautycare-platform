-- ============================================================
-- Phase 3 마이그레이션: 외국인 친화 병원 인증 필드 추가
-- 인증 조건 자동 검증 + 인증 병원 검색 우선 노출
-- ============================================================

-- ── hospitals 테이블: 외국인 친화 인증 컬럼 추가 ──
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS foreign_friendly BOOLEAN DEFAULT false;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS languages_supported TEXT[] DEFAULT '{}';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS has_interpreter BOOLEAN DEFAULT false;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS accepts_foreign_insurance BOOLEAN DEFAULT false;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS foreign_patient_ratio NUMERIC(5,2) DEFAULT 0;

-- 인덱스: 외국인 친화 병원 필터링
CREATE INDEX IF NOT EXISTS idx_hospitals_foreign_friendly ON hospitals(foreign_friendly) WHERE foreign_friendly = true;
