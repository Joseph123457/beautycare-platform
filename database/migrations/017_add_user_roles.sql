-- 017: 사용자 역할 컬럼 추가
-- 피드 콘텐츠 관리 및 관리자 기능을 위한 역할 기반 접근 제어

-- 사용자 역할 컬럼 추가 (기본값: PATIENT)
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'PATIENT' NOT NULL;

-- 역할 체크 제약 조건
ALTER TABLE users ADD CONSTRAINT chk_user_role
  CHECK (role IN ('PATIENT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'));

-- 기존 병원 소유자를 HOSPITAL_ADMIN으로 업데이트
UPDATE users SET role = 'HOSPITAL_ADMIN'
WHERE user_id IN (
  SELECT owner_user_id FROM hospitals WHERE owner_user_id IS NOT NULL
);

-- 역할 인덱스
CREATE INDEX idx_users_role ON users(role);
