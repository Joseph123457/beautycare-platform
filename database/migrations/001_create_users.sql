-- ============================================================
-- 001_create_users.sql — 사용자 테이블
-- ============================================================
-- 실행 방법:
--   psql -U postgres -d beautycare -f database/migrations/001_create_users.sql
-- ============================================================

-- 사용자 테이블 생성
CREATE TABLE IF NOT EXISTS users (
    user_id         BIGSERIAL       PRIMARY KEY,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    phone           VARCHAR(20)     UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    gender          VARCHAR(10)     CHECK (gender IN ('male', 'female', 'other')),
    birth_date      DATE,
    -- 선호 지역 최대 3개 (예: ["강남구", "서초구", "마포구"])
    preferred_regions JSONB         DEFAULT '[]'::jsonb,
    push_token      VARCHAR(512),
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- 선호 지역 최대 3개 제한
    CONSTRAINT chk_preferred_regions_max3
        CHECK (jsonb_array_length(preferred_regions) <= 3)
);

-- 이메일 검색용 인덱스 (UNIQUE 제약조건이 자동 생성하지만 명시적으로)
COMMENT ON TABLE users IS '플랫폼 사용자 (환자 + 병원 관리자)';
COMMENT ON COLUMN users.preferred_regions IS '선호 지역 배열, 최대 3개 (예: ["강남구","서초구"])';
COMMENT ON COLUMN users.push_token IS 'FCM / 카카오 알림톡 토큰';
COMMENT ON COLUMN users.is_active IS '계정 활성 상태 (탈퇴 시 false)';

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
