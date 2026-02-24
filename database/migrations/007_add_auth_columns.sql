-- ============================================================
-- 007_add_auth_columns.sql — 소셜 로그인 + 리프레시 토큰 컬럼 추가
-- ============================================================
-- 실행 방법:
--   psql -U postgres -d beautycare_db -f database/migrations/007_add_auth_columns.sql
-- 사전 조건: 001_create_users.sql 실행 완료
-- ============================================================

-- 카카오 소셜 로그인용 ID (카카오 회원번호, BIGINT)
ALTER TABLE users ADD COLUMN IF NOT EXISTS kakao_id BIGINT UNIQUE;

-- 리프레시 토큰 (로그아웃 시 무효화 용도)
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- 카카오 ID 검색 인덱스 (소셜 로그인 조회 성능)
CREATE INDEX IF NOT EXISTS idx_users_kakao_id
    ON users (kakao_id)
    WHERE kakao_id IS NOT NULL;

COMMENT ON COLUMN users.kakao_id IS '카카오 소셜 로그인 회원번호';
COMMENT ON COLUMN users.refresh_token IS 'JWT 리프레시 토큰 (로그아웃 시 NULL 처리)';
