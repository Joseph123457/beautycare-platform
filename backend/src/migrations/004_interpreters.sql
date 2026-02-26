-- 004_interpreters.sql
-- 통역 서비스 테이블: 통역사 DB + 통역 예약

/* ── 통역사 유형 ENUM ─────────────────────────────────── */
DO $$ BEGIN
  CREATE TYPE interpreter_available_type AS ENUM ('PHONE', 'VISIT', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

/* ── 통역 예약 유형 ENUM ─────────────────────────────── */
DO $$ BEGIN
  CREATE TYPE interpretation_type AS ENUM ('PHONE', 'VISIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

/* ── 통역 예약 상태 ENUM ─────────────────────────────── */
DO $$ BEGIN
  CREATE TYPE interpretation_status AS ENUM ('PENDING', 'CONFIRMED', 'DONE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

/* ── 통역사 테이블 ────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS interpreters (
  interpreter_id  SERIAL PRIMARY KEY,
  name            VARCHAR(100)   NOT NULL,
  phone           VARCHAR(20),
  email           VARCHAR(255),
  languages       JSONB          NOT NULL DEFAULT '[]',       -- 가능 언어 목록 ['en','ja','zh']
  available_type  interpreter_available_type NOT NULL DEFAULT 'BOTH',
  hourly_rate     INTEGER        NOT NULL DEFAULT 0,          -- 시간당 요금 (KRW)
  rating          DECIMAL(3,2)   NOT NULL DEFAULT 0.00,       -- 평균 평점
  review_count    INTEGER        NOT NULL DEFAULT 0,          -- 리뷰 수
  is_available    BOOLEAN        NOT NULL DEFAULT true,       -- 현재 가용 여부
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- 언어별 조회 인덱스 (GIN)
CREATE INDEX IF NOT EXISTS idx_interpreters_languages ON interpreters USING GIN (languages);

-- 가용 여부 필터 인덱스
CREATE INDEX IF NOT EXISTS idx_interpreters_available ON interpreters (is_available);

/* ── 통역 예약 테이블 ────────────────────────────────── */
CREATE TABLE IF NOT EXISTS interpretation_bookings (
  booking_id      SERIAL PRIMARY KEY,
  reservation_id  INTEGER        NOT NULL REFERENCES reservations(reservation_id),
  interpreter_id  INTEGER        NOT NULL REFERENCES interpreters(interpreter_id),
  user_id         INTEGER        NOT NULL REFERENCES users(user_id),
  type            interpretation_type   NOT NULL,             -- PHONE / VISIT
  scheduled_at    TIMESTAMPTZ    NOT NULL,                    -- 통역 예정 일시
  duration_hours  DECIMAL(4,1)   NOT NULL DEFAULT 1.0,        -- 예상 소요 시간
  total_fee       INTEGER        NOT NULL DEFAULT 0,          -- 총 통역 요금 (KRW)
  status          interpretation_status NOT NULL DEFAULT 'PENDING',
  stripe_payment_intent_id VARCHAR(255),                      -- Stripe 결제 연동
  rating          DECIMAL(3,2),                               -- 통역사 리뷰 평점
  review_content  TEXT,                                       -- 통역사 리뷰 내용
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- 예약 ID로 통역 예약 조회
CREATE INDEX IF NOT EXISTS idx_interpretation_bookings_reservation ON interpretation_bookings (reservation_id);

-- 통역사 ID로 예약 조회
CREATE INDEX IF NOT EXISTS idx_interpretation_bookings_interpreter ON interpretation_bookings (interpreter_id);

-- 사용자 ID로 내 통역 예약 조회
CREATE INDEX IF NOT EXISTS idx_interpretation_bookings_user ON interpretation_bookings (user_id);

-- 상태별 조회
CREATE INDEX IF NOT EXISTS idx_interpretation_bookings_status ON interpretation_bookings (status);

/* ── updated_at 자동 갱신 트리거 ─────────────────────── */
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_interpreters_updated_at ON interpreters;
CREATE TRIGGER trg_interpreters_updated_at
  BEFORE UPDATE ON interpreters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_interpretation_bookings_updated_at ON interpretation_bookings;
CREATE TRIGGER trg_interpretation_bookings_updated_at
  BEFORE UPDATE ON interpretation_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
