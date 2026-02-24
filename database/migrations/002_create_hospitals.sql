-- ============================================================
-- 002_create_hospitals.sql — 병원 테이블
-- ============================================================
-- 실행 방법:
--   psql -U postgres -d beautycare -f database/migrations/002_create_hospitals.sql
-- 사전 조건: 001_create_users.sql 실행 완료
-- ============================================================

-- 병원 카테고리 ENUM
CREATE TYPE hospital_category AS ENUM (
    '성형외과',
    '피부과',
    '치과',
    '안과'
);

-- 구독 등급 ENUM
CREATE TYPE subscription_tier AS ENUM (
    'FREE',
    'BASIC',
    'PRO'
);

-- 병원 테이블 생성
CREATE TABLE IF NOT EXISTS hospitals (
    hospital_id     BIGSERIAL           PRIMARY KEY,
    -- 병원을 등록한 관리자 (FK → users)
    owner_user_id   BIGINT              NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name            VARCHAR(200)        NOT NULL,
    category        hospital_category   NOT NULL,
    address         VARCHAR(500)        NOT NULL,
    -- 위도/경도: PostGIS 없이 DECIMAL로 저장
    lat             DECIMAL(10, 7)      NOT NULL,
    lng             DECIMAL(10, 7)      NOT NULL,
    description     TEXT,
    -- 운영시간 (예: {"mon":"09:00-18:00","tue":"09:00-18:00",...})
    operating_hours JSONB               DEFAULT '{}'::jsonb,

    -- 캐시 필드: 주기적 배치 또는 트리거로 갱신
    profile_score   DECIMAL(5, 2)       NOT NULL DEFAULT 0.00,
    avg_rating      DECIMAL(3, 2)       NOT NULL DEFAULT 0.00,
    review_count    INTEGER             NOT NULL DEFAULT 0,
    response_rate   DECIMAL(5, 2)       NOT NULL DEFAULT 0.00,

    -- 구독 및 인증
    subscription_tier subscription_tier NOT NULL DEFAULT 'FREE',
    is_verified     BOOLEAN             NOT NULL DEFAULT false,

    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- 위도/경도 기반 거리 계산용 복합 인덱스
-- 위경도 범위 조건(WHERE lat BETWEEN ... AND lng BETWEEN ...)으로 근처 병원 검색
CREATE INDEX idx_hospitals_location ON hospitals (lat, lng);

-- 카테고리별 검색 인덱스
CREATE INDEX idx_hospitals_category ON hospitals (category);

-- 평점순 정렬 인덱스
CREATE INDEX idx_hospitals_rating ON hospitals (avg_rating DESC);

-- 병원 소유자 인덱스
CREATE INDEX idx_hospitals_owner ON hospitals (owner_user_id);

-- updated_at 트리거 (001에서 생성한 함수 재사용)
CREATE TRIGGER trg_hospitals_updated_at
    BEFORE UPDATE ON hospitals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE hospitals IS '등록된 병원 정보';
COMMENT ON COLUMN hospitals.lat IS '위도 (예: 37.4979)';
COMMENT ON COLUMN hospitals.lng IS '경도 (예: 127.0276)';
COMMENT ON COLUMN hospitals.profile_score IS '프로필 완성도 점수 (0~100)';
COMMENT ON COLUMN hospitals.avg_rating IS '평균 별점 (캐시)';
COMMENT ON COLUMN hospitals.review_count IS '리뷰 수 (캐시)';
COMMENT ON COLUMN hospitals.response_rate IS '병원 응답률 (캐시, 0~100)';
COMMENT ON COLUMN hospitals.operating_hours IS '운영시간 JSON (예: {"mon":"09:00-18:00"})';
