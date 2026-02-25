-- 016: Stripe 외국인 예약금 결제 컬럼 추가
-- reservations 테이블에 예약금(deposit) 관련 컬럼을 추가한다.

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS deposit_amount INT,                          -- 예약금 (KRW 기준)
  ADD COLUMN IF NOT EXISTS deposit_currency VARCHAR(3),                 -- 결제 통화 (USD/JPY/CNY)
  ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE,          -- 결제 완료 여부
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(200);       -- Stripe PaymentIntent ID

-- 인덱스: Stripe PI ID로 빠른 조회 (웹훅 처리용)
CREATE INDEX IF NOT EXISTS idx_reservations_stripe_pi
  ON reservations (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
