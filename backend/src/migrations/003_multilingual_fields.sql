-- ============================================================
-- Phase 3 마이그레이션: 다국어 필드 추가
-- 병원 정보 + 시술 테이블에 영어/일본어/중국어 컬럼 추가
-- ============================================================

-- ── 1) hospitals 테이블: 다국어 컬럼 추가 ──
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS name_ja VARCHAR(200);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS name_zh VARCHAR(200);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS description_ja TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS description_zh TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS address_en VARCHAR(500);

-- ── 2) treatments 테이블 생성 (시술 마스터) ──
-- 기존에는 reservations.treatment_name에 직접 저장했으나
-- 다국어 지원을 위해 별도 시술 마스터 테이블을 생성한다.
CREATE TABLE IF NOT EXISTS treatments (
  treatment_id  SERIAL PRIMARY KEY,
  hospital_id   INTEGER NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,        -- 한국어 시술명 (원본)
  name_en       VARCHAR(200),                 -- 영어
  name_ja       VARCHAR(200),                 -- 일본어
  name_zh       VARCHAR(200),                 -- 중국어
  description   TEXT,                         -- 한국어 설명
  description_en TEXT,                        -- 영어 설명
  description_ja TEXT,                        -- 일본어 설명
  description_zh TEXT,                        -- 중국어 설명
  price         INTEGER DEFAULT 0,            -- 가격 (KRW)
  price_usd     INTEGER DEFAULT 0,            -- 가격 (USD, 센트)
  duration_min  INTEGER DEFAULT 30,           -- 시술 소요시간 (분)
  is_active     BOOLEAN DEFAULT true,         -- 활성 여부
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- 인덱스: 병원별 시술 목록 조회
CREATE INDEX IF NOT EXISTS idx_treatments_hospital ON treatments(hospital_id);

-- 인덱스: 활성 시술만 조회
CREATE INDEX IF NOT EXISTS idx_treatments_active ON treatments(hospital_id, is_active);

-- updated_at 자동 갱신 트리거 (기존 패턴과 동일)
CREATE OR REPLACE FUNCTION update_treatments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_treatments_updated_at ON treatments;
CREATE TRIGGER trg_treatments_updated_at
  BEFORE UPDATE ON treatments
  FOR EACH ROW
  EXECUTE FUNCTION update_treatments_updated_at();
