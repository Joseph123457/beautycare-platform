-- 012: AI 리뷰 분석 기능 추가
-- reviews 테이블에 AI 분석 결과 컬럼, monthly_reports 테이블 생성

-- reviews 테이블에 AI 분석 결과 컬럼 추가
-- JSONB 형태: { sentiment, score, keywords, summary }
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT NULL;

-- 월간 리포트 테이블
CREATE TABLE IF NOT EXISTS monthly_reports (
  report_id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT NOT NULL REFERENCES hospitals(hospital_id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  report_data JSONB NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hospital_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_hospital ON monthly_reports(hospital_id);
