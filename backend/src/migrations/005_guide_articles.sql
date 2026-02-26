-- 005_guide_articles.sql
-- 의료관광 가이드 콘텐츠 테이블: 가이드 아티클 + 회복 숙소

/* ── 가이드 카테고리 ENUM ────────────────────────────── */
DO $$ BEGIN
  CREATE TYPE guide_category AS ENUM (
    'VISA', 'RECOVERY', 'TRANSPORT', 'ACCOMMODATION', 'INSURANCE', 'PROCEDURE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

/* ── 가이드 아티클 테이블 ────────────────────────────── */
CREATE TABLE IF NOT EXISTS guide_articles (
  article_id    SERIAL PRIMARY KEY,
  category      guide_category     NOT NULL,
  title_ko      VARCHAR(300)       NOT NULL DEFAULT '',
  title_en      VARCHAR(300)       NOT NULL DEFAULT '',
  title_ja      VARCHAR(300)       NOT NULL DEFAULT '',
  title_zh      VARCHAR(300)       NOT NULL DEFAULT '',
  content_ko    TEXT               NOT NULL DEFAULT '',
  content_en    TEXT               NOT NULL DEFAULT '',
  content_ja    TEXT               NOT NULL DEFAULT '',
  content_zh    TEXT               NOT NULL DEFAULT '',
  thumbnail_url VARCHAR(500),
  tags          JSONB              NOT NULL DEFAULT '[]',
  view_count    INTEGER            NOT NULL DEFAULT 0,
  is_published  BOOLEAN            NOT NULL DEFAULT false,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- 카테고리별 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_guide_articles_category ON guide_articles (category);

-- 발행 상태 인덱스
CREATE INDEX IF NOT EXISTS idx_guide_articles_published ON guide_articles (is_published);

-- 태그 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_guide_articles_tags ON guide_articles USING GIN (tags);

/* ── 회복 숙소 테이블 ────────────────────────────────── */
CREATE TABLE IF NOT EXISTS recovery_houses (
  house_id        SERIAL PRIMARY KEY,
  name            VARCHAR(200)     NOT NULL,
  address         VARCHAR(500)     NOT NULL,
  lat             DECIMAL(10, 7),
  lng             DECIMAL(10, 7),
  description_ko  TEXT             NOT NULL DEFAULT '',
  description_en  TEXT             NOT NULL DEFAULT '',
  description_ja  TEXT             NOT NULL DEFAULT '',
  description_zh  TEXT             NOT NULL DEFAULT '',
  price_per_night INTEGER          NOT NULL DEFAULT 0,    -- 1박 요금 (KRW)
  amenities       JSONB            NOT NULL DEFAULT '[]', -- ['wifi','nursing','airport_shuttle',...]
  photos          JSONB            NOT NULL DEFAULT '[]', -- 사진 URL 배열
  contact_phone   VARCHAR(30),
  contact_url     VARCHAR(500),
  rating          DECIMAL(3, 2)    NOT NULL DEFAULT 0.00,
  review_count    INTEGER          NOT NULL DEFAULT 0,
  is_active       BOOLEAN          NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- 활성 상태 인덱스
CREATE INDEX IF NOT EXISTS idx_recovery_houses_active ON recovery_houses (is_active);

-- 위치 기반 정렬용 인덱스
CREATE INDEX IF NOT EXISTS idx_recovery_houses_location ON recovery_houses (lat, lng);

/* ── updated_at 자동 갱신 트리거 ─────────────────────── */
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_guide_articles_updated_at ON guide_articles;
CREATE TRIGGER trg_guide_articles_updated_at
  BEFORE UPDATE ON guide_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_recovery_houses_updated_at ON recovery_houses;
CREATE TRIGGER trg_recovery_houses_updated_at
  BEFORE UPDATE ON recovery_houses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

/* ── 시드 데이터: 가이드 아티클 ──────────────────────── */

-- 1. 비자 가이드
INSERT INTO guide_articles (category, title_en, title_ko, title_ja, title_zh, content_en, content_ko, content_ja, content_zh, tags, is_published, published_at)
VALUES (
  'VISA',
  'Medical Visa Guide: Do You Need One?',
  '의료 비자 가이드: 비자가 필요한가요?',
  '医療ビザガイド：ビザは必要ですか？',
  '医疗签证指南：您需要签证吗？',
  E'## Visa Requirements for Medical Tourism in Korea\n\n### Visa-Free Countries\nCitizens from the following countries can enter Korea without a visa for short-term medical procedures (up to 90 days):\n- **United States**, **Canada**, **United Kingdom**, **Australia**, **Japan**\n- Most **EU countries** (France, Germany, Italy, Spain, etc.)\n- **Singapore**, **Malaysia**, **Thailand** (up to 90 days)\n\n### Countries Requiring a Visa\n- **China**: C-3-3 (Medical Tourism) visa required. Apply at Korean embassy with hospital appointment letter.\n- **India**: Short-term visa required.\n- **Vietnam**, **Philippines**, **Indonesia**: Tourist or medical visa required.\n\n### C-3-3 Medical Tourism Visa\nThis special visa is for patients traveling to Korea for medical procedures.\n\n**Required Documents:**\n1. Valid passport (6+ months remaining)\n2. Visa application form\n3. Hospital appointment confirmation letter\n4. Proof of financial ability (bank statement)\n5. Round-trip flight reservation\n6. Travel insurance certificate\n\n**Processing Time:** 5-7 business days\n**Fee:** Varies by country ($40-80 USD)\n\n### Tips\n- Apply at least 2 weeks before your trip\n- Some hospitals can issue invitation letters to speed up the process\n- Medical visa allows multiple entries within the validity period',
  E'## 한국 의료관광 비자 요건\n\n### 무비자 입국 가능 국가\n단기 의료 시술(90일 이내) 목적으로 비자 없이 입국 가능한 국가:\n- 미국, 캐나다, 영국, 호주, 일본\n- 대부분의 EU 국가\n- 싱가포르, 말레이시아, 태국\n\n### 비자 필요 국가\n- 중국: C-3-3 의료관광 비자 필요\n- 인도: 단기 비자 필요\n- 베트남, 필리핀, 인도네시아: 관광 또는 의료 비자 필요',
  E'## 韓国医療観光のビザ要件\n\nビザ免除国、ビザ必要国、C-3-3医療観光ビザの詳細情報をご確認ください。',
  E'## 韩国医疗旅游签证要求\n\n免签国家、需要签证的国家以及C-3-3医疗旅游签证的详细信息。',
  '["visa", "travel", "immigration", "C-3-3"]',
  true,
  NOW()
)
ON CONFLICT DO NOTHING;

-- 2. 회복 가이드
INSERT INTO guide_articles (category, title_en, title_ko, title_ja, title_zh, content_en, content_ko, content_ja, content_zh, tags, is_published, published_at)
VALUES (
  'RECOVERY',
  'Recovery Timeline: What to Expect After Your Procedure',
  '회복 타임라인: 시술 후 알아야 할 사항',
  '回復タイムライン：施術後に知っておくべきこと',
  '恢复时间表：术后须知',
  E'## Recovery Guide by Procedure\n\n### Rhinoplasty (Nose Surgery)\n- **Hospital Stay:** 0-1 night\n- **Splint Removal:** 5-7 days\n- **Swelling Subsides:** 2-4 weeks (80%), 3-6 months (final)\n- **Return to Work:** 7-10 days\n- **Fly Home:** After 7-10 days minimum\n- **Tip:** Sleep with head elevated for the first week\n\n### Blepharoplasty (Eye Surgery)\n- **Hospital Stay:** Outpatient (same-day)\n- **Stitch Removal:** 5-7 days\n- **Swelling Subsides:** 1-2 weeks (major), 1-3 months (final)\n- **Return to Work:** 5-7 days\n- **Fly Home:** After 5-7 days\n- **Tip:** Use cold compresses for the first 48 hours\n\n### Liposuction\n- **Hospital Stay:** 0-1 night\n- **Compression Garment:** 4-6 weeks\n- **Swelling Subsides:** 2-4 weeks (major), 3-6 months (final)\n- **Return to Work:** 3-7 days (desk job), 2-4 weeks (physical)\n- **Fly Home:** After 5-7 days\n- **Tip:** Walk gently from day 1 to prevent blood clots\n\n### Facelift\n- **Hospital Stay:** 1-2 nights\n- **Stitch Removal:** 7-10 days\n- **Swelling Subsides:** 2-4 weeks (major), 3-6 months (final)\n- **Return to Work:** 10-14 days\n- **Fly Home:** After 10-14 days\n\n### General Tips\n- Follow your surgeon''s post-op instructions carefully\n- Stay hydrated and eat nutritious food\n- Avoid alcohol and smoking for at least 2 weeks\n- Keep follow-up appointments before leaving Korea\n- Consider staying at a recovery house near your clinic',
  E'## 시술별 회복 가이드\n\n### 코 성형\n- 입원: 0~1박 / 부목 제거: 5~7일 / 붓기: 2~4주 (80%)\n- 귀국: 최소 7~10일 후\n\n### 눈 성형\n- 당일 퇴원 / 발사: 5~7일 / 붓기: 1~2주\n- 귀국: 5~7일 후\n\n### 지방흡입\n- 입원: 0~1박 / 압박복: 4~6주\n- 귀국: 5~7일 후',
  E'## 施術別回復ガイド\n\n鼻整形、目の整形、脂肪吸引、フェイスリフトの回復期間と注意事項をご確認ください。',
  E'## 各项目恢复指南\n\n鼻整形、眼整形、吸脂、拉皮手术的恢复期和注意事项。',
  '["recovery", "rhinoplasty", "blepharoplasty", "liposuction", "facelift", "post-op"]',
  true,
  NOW()
)
ON CONFLICT DO NOTHING;

-- 3. 교통 가이드
INSERT INTO guide_articles (category, title_en, title_ko, title_ja, title_zh, content_en, content_ko, content_ja, content_zh, tags, is_published, published_at)
VALUES (
  'TRANSPORT',
  'Getting to Gangnam: Airport to Clinic Transportation Guide',
  '강남 가는 방법: 공항에서 병원까지 교통 가이드',
  '江南へのアクセス：空港からクリニックまでの交通ガイド',
  '前往江南：机场到医院交通指南',
  E'## Incheon Airport (ICN) to Gangnam\n\n### Option 1: Airport Limousine Bus (Recommended)\n- **Route:** Bus #6009 → Gangnam Station\n- **Duration:** 70-90 min (depending on traffic)\n- **Cost:** ₩17,000 (~$13 USD)\n- **Schedule:** Every 15-20 min, 5:30 AM - 11:00 PM\n- **Pros:** Direct, comfortable, luggage space\n- **Where to board:** 1F Arrivals, Bus Stop 5B or 12A\n\n### Option 2: AREX + Subway\n- **Step 1:** AREX Express Train → Seoul Station (43 min, ₩9,500)\n- **Step 2:** Subway Line 4 → Sadang → Line 2 → Gangnam (30 min, ₩1,400)\n- **Total Duration:** ~80 min\n- **Total Cost:** ₩10,900 (~$8 USD)\n- **Pros:** Cheapest option, no traffic delays\n- **Tip:** Buy a T-money card at the airport convenience store\n\n### Option 3: Taxi\n- **Regular Taxi:** ₩65,000-80,000 (~$50-60 USD), 60-90 min\n- **International Taxi:** ₩75,000-100,000, English-speaking driver\n- **Pros:** Door-to-door, comfortable\n- **Tip:** Use KakaoTaxi app or ask info desk for International Taxi\n\n### Option 4: Private Car Service\n- **Cost:** ₩100,000-150,000 (~$75-110 USD)\n- **Pros:** Premium, driver meets you at arrival gate with name sign\n- **Booking:** Most clinics offer airport pickup — ask when booking\n\n### Key Subway Stations Near Clinics\n| Station | Line | Area |\n|---------|------|------|\n| Gangnam | Line 2 | Gangnam Medical District |\n| Sinnonhyeon | Line 9 | Gangnam Clinic Area |\n| Apgujeong Rodeo | Bundang Line | Apgujeong Beauty Clinics |\n| Cheongdam | Line 7 | Premium Clinics |\n\n### Useful Tips\n- Get a T-money card for all public transport\n- Download Naver Map (more accurate than Google Maps in Korea)\n- Airport Railroad (AREX) runs every 30-40 min\n- Most clinic neighborhoods are within 5 min walk from subway',
  E'## 인천공항에서 강남까지\n\n### 1. 공항 리무진 버스 (추천)\n- 6009번 → 강남역 / 70~90분 / ₩17,000\n\n### 2. AREX + 지하철\n- 공항철도 → 서울역 (43분) → 2호선 강남역 (30분)\n- 총 ₩10,900\n\n### 3. 택시\n- 일반: ₩65,000~80,000 / 국제택시: ₩75,000~100,000',
  E'## 仁川空港から江南へ\n\nリムジンバス、AREX+地下鉄、タクシーなどのアクセス方法をご確認ください。',
  E'## 从仁川机场到江南\n\n机场大巴、AREX+地铁、出租车等交通方式详情。',
  '["transport", "airport", "gangnam", "subway", "taxi", "AREX"]',
  true,
  NOW()
)
ON CONFLICT DO NOTHING;

-- 4. 보험 가이드
INSERT INTO guide_articles (category, title_en, title_ko, title_ja, title_zh, content_en, content_ko, content_ja, content_zh, tags, is_published, published_at)
VALUES (
  'INSURANCE',
  'Travel Insurance for Medical Tourism: What You Need to Know',
  '의료관광 여행 보험: 알아야 할 사항',
  '医療観光のための旅行保険：知っておくべきこと',
  '医疗旅游保险：您需要了解的信息',
  E'## Travel Insurance for Medical Procedures in Korea\n\n### Why You Need Insurance\n- Korean hospitals require upfront payment for elective procedures\n- Complications, though rare, can be expensive without coverage\n- Travel insurance covers trip cancellation, lost luggage, and medical emergencies\n\n### What Standard Travel Insurance Covers\n- Emergency medical treatment (accidents, sudden illness)\n- Trip cancellation / interruption\n- Lost or delayed baggage\n- Emergency evacuation\n\n### What It Usually Does NOT Cover\n- Elective cosmetic procedures themselves\n- Complications from cosmetic surgery (varies by policy)\n- Pre-existing conditions\n\n### Recommended Insurance Providers\n\n#### For US Citizens\n- **World Nomads:** Covers medical emergencies abroad, ~$50-100/week\n- **Allianz Travel Insurance:** Comprehensive plans, ~$40-80/week\n- **IMG Global:** Specifically designed for medical tourism\n\n#### For Japanese Citizens\n- **Tokio Marine & Nichido:** Overseas travel insurance with medical coverage\n- **Sompo Japan:** Comprehensive travel insurance\n- **AIG Japan:** Medical tourism specific plans available\n\n#### For Chinese Citizens\n- **Ping An Insurance:** Overseas medical coverage\n- **China Pacific Insurance:** Travel + medical plans\n- **AXA China:** International coverage\n\n### Medical Tourism-Specific Insurance\nSome providers offer policies specifically for medical tourism:\n- **Global Protective Solutions:** Covers complications from elective procedures\n- **Mediguard:** Surgery-specific coverage\n- **Cost:** $150-400 depending on procedure type\n\n### Tips\n1. Purchase insurance BEFORE booking your procedure\n2. Read the fine print about cosmetic surgery exclusions\n3. Keep all medical receipts for potential claims\n4. Ask your clinic about their complication coverage policy\n5. Consider a policy that covers extended stay if recovery takes longer\n6. Carry your insurance card and emergency contact number at all times',
  E'## 한국 의료시술을 위한 여행 보험\n\n### 보험이 필요한 이유\n- 한국 병원은 선불 결제 원칙\n- 합병증 발생 시 비용 부담 가능\n\n### 보장 범위\n- 응급 의료 치료, 여행 취소, 수하물 분실\n- 단, 선택적 미용 시술 자체는 보장 안 됨\n\n### 추천 보험사\n- 미국: World Nomads, Allianz\n- 일본: 도쿄해상, 손보재팬\n- 중국: 핑안보험, 중국태평양보험',
  E'## 韓国での医療施術のための旅行保険\n\n保険の必要性、保障範囲、おすすめの保険会社をご確認ください。',
  E'## 韩国医疗手术旅行保险\n\n了解保险的必要性、保障范围和推荐的保险公司。',
  '["insurance", "travel", "coverage", "medical", "safety"]',
  true,
  NOW()
)
ON CONFLICT DO NOTHING;

/* ── 시드 데이터: 회복 숙소 ──────────────────────────── */

INSERT INTO recovery_houses (name, address, lat, lng, description_en, description_ko, description_ja, description_zh, price_per_night, amenities, photos, contact_phone, rating, review_count)
VALUES
(
  'Gangnam Recovery Stay',
  '서울특별시 강남구 역삼동 123-45',
  37.4979, 127.0276,
  'Premium recovery accommodation in the heart of Gangnam. Walking distance to major clinics. Nursing staff available 24/7. All rooms equipped with medical-grade beds and refrigerators for medication storage.',
  '강남 중심부 프리미엄 회복 숙소. 주요 병원 도보 거리. 24시간 간호 인력 배치. 의료용 침대 및 약품 보관 냉장고 구비.',
  '江南中心部のプレミアム回復宿泊施設。主要クリニックまで徒歩圏内。24時間看護スタッフ常駐。',
  '江南核心地段高端恢复住所。步行即可到达主要医院。24小时护理人员值班。',
  120000,
  '["wifi", "nursing", "airport_shuttle", "meal_service", "laundry", "medical_bed"]',
  '[]',
  '02-555-1234',
  4.8,
  127
),
(
  'Apgujeong Healing House',
  '서울특별시 강남구 신사동 654-32',
  37.5242, 127.0236,
  'Cozy recovery house near Apgujeong Rodeo station. Specialized in post-surgical care with experienced nurses. Includes daily meal plans tailored to recovery needs.',
  '압구정 로데오역 인근 회복 숙소. 숙련된 간호사와 함께 수술 후 관리 전문. 회복 맞춤 식단 제공.',
  '狎鷗亭ロデオ駅近くの回復施設。経験豊富な看護師による術後ケア専門。',
  '狎鸥亭罗德奥站附近的恢复住所。经验丰富的护士专业术后护理。',
  90000,
  '["wifi", "nursing", "meal_service", "pharmacy_nearby"]',
  '[]',
  '02-544-5678',
  4.6,
  89
),
(
  'Seoul Medical Guest House',
  '서울특별시 서초구 서초동 789-12',
  37.4837, 127.0073,
  'Budget-friendly recovery accommodation near Express Bus Terminal. Clean, comfortable rooms with basic amenities. Airport limousine bus stop within 3 minutes walk.',
  '고속버스터미널 인근 합리적 가격의 회복 숙소. 깨끗하고 편안한 객실. 공항 리무진 버스 정류장 도보 3분.',
  '高速バスターミナル近くの手頃な回復宿泊施設。清潔で快適な客室。',
  '高速客运站附近经济实惠的恢复住所。干净舒适的房间。',
  65000,
  '["wifi", "airport_shuttle", "laundry", "kitchen"]',
  '[]',
  '02-521-9012',
  4.3,
  56
)
ON CONFLICT DO NOTHING;
