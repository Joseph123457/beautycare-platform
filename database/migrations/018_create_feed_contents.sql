-- 018: 피드 콘텐츠 테이블 생성
-- 병원이 올리는 시술 전후 사진, 가격 정보 등을 저장하는 숏폼 피드

CREATE TABLE feed_contents (
  content_id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL,
  photo_urls JSONB NOT NULL DEFAULT '[]',
  description TEXT,
  pricing_info TEXT,
  tags JSONB DEFAULT '[]',
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_feed_contents_hospital_id ON feed_contents(hospital_id);
CREATE INDEX idx_feed_contents_category ON feed_contents(category);
CREATE INDEX idx_feed_contents_approved_active ON feed_contents(is_approved, is_active);
CREATE INDEX idx_feed_contents_created_at ON feed_contents(created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_feed_contents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_feed_contents_updated_at
  BEFORE UPDATE ON feed_contents
  FOR EACH ROW
  EXECUTE FUNCTION update_feed_contents_updated_at();
