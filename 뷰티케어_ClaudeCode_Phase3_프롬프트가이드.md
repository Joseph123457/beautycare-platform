# 💻 뷰티케어 플랫폼 — Phase 3 Claude Code 프롬프트 가이드
## 외국인 의료관광 타겟 앱

> **Phase 2 완료 축하드립니다! 🎉**
> Phase 3는 공통 백엔드를 그대로 재활용하면서 외국인 전용 앱을 빠르게 구축하는 단계입니다.
> 새로 백엔드를 만들지 않아요 — 기존 API에 다국어·외화결제·관광 기능만 추가합니다.

---

## Phase 3 전체 구성

| STEP | 기능 | 예상 소요 |
|------|------|-----------|
| STEP 14 | 다국어(i18n) 지원 — 영어·일본어·중국어 | 1주 |
| STEP 15 | 외국인 전용 앱 UI/UX 재설계 | 1주 |
| STEP 16 | 해외 결제 연동 (Stripe) | 1주 |
| STEP 17 | 통역 서비스 연결 | 3~5일 |
| STEP 18 | 의료관광 가이드 콘텐츠 | 3~5일 |
| STEP 19 | 외국인 전용 병원 대시보드 기능 | 1주 |

---

## ⚠️ Phase 3 시작 전 필수 확인

### Claude Code에 붙여넣기 (첫 번째로 실행)

```
Phase 3 작업을 시작할 준비를 해줘.
현재 프로젝트 구조를 파악하고 CLAUDE.md를 아래 내용으로 업데이트해줘.

# 뷰티케어 플랫폼 (BeautyCare Platform)

## 프로젝트 개요
성형·미용 병원과 환자를 연결하는 플랫폼.
Phase 1 (MVP), Phase 2 (구독·채팅·AI분석) 완료 상태.
Phase 3 — 외국인 의료관광 타겟 앱 구축 중.

## 앱 구성 (2개 앱, 1개 백엔드)
- mobile/          : 기존 한국인 환자용 앱 (유지)
- mobile-foreign/  : 신규 외국인 전용 앱 (Phase 3 신규)
- dashboard/       : 병원 관리 대시보드 (외국인 기능 추가)
- backend/         : 공통 백엔드 API (다국어 확장)

## 지원 언어
- ko: 한국어 (기존)
- en: 영어 (신규)
- ja: 일본어 (신규)
- zh: 중국어 간체 (신규)

## 기술 스택
- Backend: Node.js, Express, PostgreSQL, Redis, JWT, Socket.io
- Mobile: React Native (Expo) — 두 앱 공통
- i18n: react-i18next (모바일), i18next (백엔드)
- 해외결제: Stripe (USD/JPY/CNY)
- 국내결제: 토스페이먼츠 (KRW) — 기존 유지
- 번역: DeepL API (자동 번역 보조)

## 코딩 규칙
- 모든 코드에 한국어 주석 포함
- API 응답은 { success, data, message } 형태로 통일
- 다국어 텍스트는 절대 하드코딩 금지 — 반드시 i18n 키 사용
- 에러 처리는 반드시 try-catch로
- 환경변수는 .env 파일 사용
```

---

## STEP 14 — 다국어(i18n) 지원

> 기존 한국어 앱을 건드리지 않고, 영어·일본어·중국어를 추가하는 단계예요.
> 번역 텍스트를 코드와 분리해서 나중에 쉽게 수정할 수 있게 만들어요.

### 프롬프트 14-A: 백엔드 다국어 처리

```
backend/ 에 다국어 처리를 추가해줘.

## 설치 패키지
- i18next
- i18next-fs-backend

## 폴더 구조 추가
backend/
└── src/
    └── locales/
        ├── ko/
        │   ├── common.json     # 공통 메시지
        │   ├── errors.json     # 에러 메시지
        │   └── notifications.json  # 푸시/알림 메시지
        ├── en/
        │   ├── common.json
        │   ├── errors.json
        │   └── notifications.json
        ├── ja/
        │   └── (동일 구조)
        └── zh/
            └── (동일 구조)

## 번역 파일 내용 예시 (ko/common.json)
{
  "reservation": {
    "confirmed": "예약이 확정되었습니다",
    "cancelled": "예약이 취소되었습니다",
    "reminder": "{{hospital}}에 예약이 있습니다"
  },
  "review": {
    "request": "방문은 어떠셨나요? 솔직한 후기를 남겨주세요",
    "approved": "리뷰가 승인되었습니다"
  },
  "errors": {
    "unauthorized": "로그인이 필요합니다",
    "notFound": "정보를 찾을 수 없습니다",
    "subscriptionRequired": "{{tier}} 플랜 이상에서 사용 가능합니다"
  }
}

## 구현 사항
- 요청 헤더의 Accept-Language 값으로 언어 자동 감지
  (en, ja, zh, ko 지원 — 기본값 ko)
- 미들웨어: middlewares/i18n.js
  req.language 에 감지된 언어 코드 저장
- 모든 API 에러 메시지를 i18n으로 반환
- 푸시 알림 메시지도 사용자 언어에 맞게 발송

en, ja, zh 번역 파일 내용도 함께 작성해줘.
한국어 주석 포함.
```

### 프롬프트 14-B: 병원 정보 다국어 필드 추가

```
병원 정보에 다국어 필드를 추가해줘.

## DB 변경사항

### hospitals 테이블에 컬럼 추가
ALTER TABLE hospitals ADD COLUMN name_en VARCHAR(200);
ALTER TABLE hospitals ADD COLUMN name_ja VARCHAR(200);
ALTER TABLE hospitals ADD COLUMN name_zh VARCHAR(200);
ALTER TABLE hospitals ADD COLUMN description_en TEXT;
ALTER TABLE hospitals ADD COLUMN description_ja TEXT;
ALTER TABLE hospitals ADD COLUMN description_zh TEXT;
ALTER TABLE hospitals ADD COLUMN address_en VARCHAR(500);

### treatments 테이블에 컬럼 추가 (시술명 다국어)
ALTER TABLE treatments ADD COLUMN name_en VARCHAR(200);
ALTER TABLE treatments ADD COLUMN name_ja VARCHAR(200);
ALTER TABLE treatments ADD COLUMN name_zh VARCHAR(200);
ALTER TABLE treatments ADD COLUMN description_en TEXT;
ALTER TABLE treatments ADD COLUMN description_ja TEXT;
ALTER TABLE treatments ADD COLUMN description_zh TEXT;

## API 변경사항

GET /api/hospitals/search 및 GET /api/hospitals/:id 수정:
- 요청 헤더의 언어(Accept-Language)에 따라 해당 언어 필드 반환
- 영문 필드가 비어있으면 DeepL API로 자동 번역 후 저장
- 번역 결과는 DB에 캐시 (매번 번역 API 호출 방지)

POST /api/hospitals/:id/translate — 병원 정보 수동 번역 요청
- 원장이 직접 영문/일문/중문 설명을 입력할 수 있는 엔드포인트
- 미입력 시 DeepL 자동 번역으로 채움

환경변수: DEEPL_API_KEY
한국어 주석 포함.
```

---

## STEP 15 — 외국인 전용 앱 UI/UX 재설계

> 기존 한국인 앱(mobile/)을 복사해서 외국인 전용 앱(mobile-foreign/)을 만들어요.
> 동일한 API를 쓰지만, 화면 구성과 UX를 외국인 의료관광객에 맞게 재설계해요.

### 프롬프트 15-A: 외국인 앱 프로젝트 생성

```
mobile-foreign/ 폴더에 외국인 의료관광 전용 React Native (Expo) 앱을 만들어줘.
기존 mobile/ 앱을 기반으로 하되, 외국인 관광객에 최적화된 구조로 재설계해줘.

## 핵심 차이점 (기존 앱 대비)

1. 언어 선택 온보딩
   - 앱 첫 실행 시 언어 선택 화면: 🇺🇸 English / 🇯🇵 日本語 / 🇨🇳 中文
   - 선택 후 AsyncStorage에 저장, 이후 자동 적용

2. 탭 구성 변경
   기존:  홈 | 탐색 | 예약 | 채팅 | 마이
   외국인: 홈 | 병원찾기 | 관광가이드 | 예약 | 마이

3. 홈 화면 차별화
   - 'K-Beauty in Korea' 헤더 (영문)
   - 인기 시술 카테고리 (Before/After 사진 강조)
   - '지금 예약 가능' 뱃지 (외국인은 당일 예약 니즈 높음)
   - 환율 표시 (KRW → USD/JPY/CNY 실시간)
   - 여행 일정 기반 추천 ('체류 기간이 며칠이에요?' 입력 후 맞춤 추천)

4. 병원 카드 UI 변경
   - 외국인 친화 병원 뱃지 (통역 가능, 영어 상담 가능)
   - 가격을 USD/JPY/CNY로도 표시
   - 리뷰에서 외국인 작성 리뷰 우선 표시

## 설치 패키지
- react-i18next
- i18next
- @react-native-async-storage/async-storage
- react-native-localize (기기 언어 자동 감지)

폴더 구조는 mobile/ 과 동일하게.
한국어 주석 포함.
```

### 프롬프트 15-B: 언어 선택 온보딩 화면

```
@mobile-foreign/src/screens/OnboardingScreen.tsx 를 만들어줘.

## 화면 흐름
1. 스플래시 로딩 (1.5초)
2. 언어 선택 화면:
   - 상단: 'Welcome to K-Beauty' 로고 + 서울 스카이라인 배경
   - 언어 선택 버튼 3개 (크게):
     🇺🇸 English
     🇯🇵 日本語
     🇨🇳 中文 (简体)
   - 하단 작게: '한국어' 링크 (기존 한국인 앱으로 이동)
3. 언어 선택 후 → 여행 일정 입력 화면:
   - '한국에 언제 오시나요?' (입력: 입국일 ~ 출국일)
   - '관심 있는 시술은?' (다중 선택: 코/눈/피부/치아/기타)
   - '완료' 버튼 → 홈으로 이동 (선택 정보 AsyncStorage 저장)

## 기술 구현
- AsyncStorage에 { language, arrivalDate, departureDate, interests } 저장
- 다음 앱 실행 시 저장된 언어 있으면 이 화면 스킵
- i18next 언어 설정 동시 적용

Tailwind(NativeWind) 또는 StyleSheet 사용.
선택된 버튼 파란색 테두리 강조.
```

### 프롬프트 15-C: 병원 상세 화면 (외국인 특화)

```
@mobile-foreign/src/screens/HospitalDetailScreen.tsx 를 외국인 특화 버전으로 만들어줘.

## 기존 병원 상세와 다른 점

1. 외국인 친화 정보 섹션 추가
   - 통역 서비스: '한국어 통역 제공' / '영어 상담 가능' / '중국어 상담 가능' 뱃지
   - 외국인 환자 비율 (예: '전체 환자의 30%가 외국인')
   - 외국인 전용 패키지 여부

2. 가격 표시
   - KRW + 선택 통화 동시 표시 (예: ₩1,200,000 / $900)
   - 환율은 실시간 API로 가져오기 (exchangerate-api.com 무료 API)
   - '가격에 상담비 포함됨' 여부 표시

3. 외국인 리뷰 탭 추가
   - '전체 리뷰' / '외국인 리뷰만' 탭 분리
   - 리뷰에 국기 이모지 표시 (작성자 국적 기반)
   - 구글 번역 버튼 (한국어 리뷰 → 선택 언어로 번역)

4. 예약 시 추가 정보
   - 통역사 동행 옵션 선택
   - 여권 사진 업로드 (외국인 신원 확인용, 선택사항)
   - 여행 보험 번호 입력 (선택사항)

API:
- GET /api/hospitals/:id (Accept-Language 헤더로 언어 전달)
- GET /api/exchange-rates (환율 조회)

선택 언어에 맞게 모든 텍스트 i18n 적용.
```

---

## STEP 16 — 해외 결제 연동 (Stripe)

> 외국인 환자가 USD, JPY, CNY로 결제할 수 있게 Stripe를 연동해요.
> 기존 토스페이먼츠(KRW)는 그대로 유지하고 병행 운영합니다.

### 프롬프트 16-A: Stripe 백엔드 연동

```
Stripe를 백엔드에 연동해서 외국인 환자 결제를 구현해줘.
backend/src/controllers/stripePayments.js 를 생성해줘.

## 결제 시나리오

### 1. 예약금 결제 (외국인 전용)
  - 외국인 환자가 예약 시 예약금(deposit) 결제
  - 금액: 시술 금액의 20~30% (병원이 설정)
  - 통화: USD / JPY / CNY (사용자 선택)
  - 환율 적용 후 KRW로 환산해서 병원에 정산

### 2. 시술 잔금 결제 (선택)
  - 예약금 제외한 잔금을 앱에서 결제
  - 또는 내원 후 현금/카드 직접 결제 선택 가능

## 구현할 API

### POST /api/payments/stripe/create-intent — 결제 의도 생성
  - 입력: amount(KRW), currency(usd|jpy|cny), reservation_id
  - Stripe Payment Intent 생성
  - client_secret 반환 (프론트에서 결제창 열 때 사용)
  - 환율 변환: 실시간 환율 API → 입력 통화 금액 계산

### POST /api/payments/stripe/confirm — 결제 확인
  - Stripe webhook 수신 (payment_intent.succeeded)
  - 결제 성공 시 reservations 테이블 deposit_paid: true 업데이트
  - 병원에 '예약금 입금 완료' 푸시 알림 발송

### POST /api/payments/stripe/refund — 환불 처리
  - 예약 취소 시 예약금 환불
  - 취소 시점에 따른 환불 정책 적용:
    * 예약일 7일 전 이상: 100% 환불
    * 3~7일 전: 50% 환불
    * 3일 이내: 환불 불가

## DB 추가
reservations 테이블에 컬럼 추가:
  - deposit_amount INT (예약금 KRW)
  - deposit_currency VARCHAR(3) (결제 통화)
  - deposit_paid BOOLEAN DEFAULT FALSE
  - stripe_payment_intent_id VARCHAR(200)

환경변수: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
Stripe SDK: npm install stripe
한국어 주석 포함.
```

### 프롬프트 16-B: 모바일 앱 Stripe 결제 화면

```
@mobile-foreign/src/screens/PaymentScreen.tsx 를 만들어줘.
Stripe React Native SDK로 결제창을 구현해줘.

## 설치
npm install @stripe/stripe-react-native

## 화면 구성

1. 결제 금액 확인
   - 시술명, 예약일시
   - 예약금 금액: ₩XXX,XXX (= $XXX / ¥XXX,XXX / ¥XXX)
   - 환율 기준 표시 (예: 기준환율 1 USD = 1,320 KRW)

2. 결제 수단 선택
   - 💳 신용/체크카드 (Stripe 기본)
   - 결제 국가 선택 (미국/일본/중국/기타)

3. 카드 정보 입력
   - Stripe 제공 CardField 컴포넌트 사용 (보안)
   - 카드 번호, 유효기간, CVC 자동 포맷팅

4. 결제 완료 화면
   - 영수증 이메일 발송 안내
   - '예약 확인서 보기' 버튼
   - '홈으로' 버튼

## 기술 구현
- StripeProvider로 앱 전체 래핑 (App.tsx)
- confirmPayment로 결제 처리
- 결제 실패 시 에러 메시지 다국어 표시

선택 언어(i18n)에 맞게 모든 텍스트 적용.
한국어 주석 포함.
```

### 프롬프트 16-C: 환율 조회 API

```
backend/src/services/exchangeRate.js 를 만들어줘.

## 기능
- exchangerate-api.com 무료 API로 실시간 환율 조회
  (무료 플랜: 1,500회/월 — 충분)
- KRW → USD / JPY / CNY 환율 계산
- 환율은 Redis에 1시간 캐시 (API 호출 최소화)

## 구현할 API

### GET /api/exchange-rates — 현재 환율 조회
  응답:
  {
    "KRW_USD": 0.00076,
    "KRW_JPY": 0.11,
    "KRW_CNY": 0.0054,
    "updated_at": "2025-02-25T09:00:00Z"
  }

## 유틸 함수
convertKRW(amount, targetCurrency):
  - KRW 금액을 받아서 대상 통화로 변환
  - 소수점 처리: USD는 소수점 2자리, JPY는 정수, CNY는 소수점 2자리

환경변수: EXCHANGE_RATE_API_KEY
Redis 캐시 적용.
한국어 주석 포함.
```

---

## STEP 17 — 통역 서비스 연결

> 외국인 환자가 병원에서 소통할 수 있게 통역사를 연결해주는 기능이에요.
> 전화 통역(실시간)과 동행 통역(예약제) 두 가지를 지원합니다.

### 프롬프트 17-A: 통역 서비스 백엔드

```
외국인 환자 통역 서비스 기능을 만들어줘.
backend/src/controllers/interpreters.js 를 생성해줘.

## DB 테이블 추가

interpreters 테이블 (통역사 DB):
  - interpreter_id (PK)
  - name, phone, email
  - languages (JSONB) — 가능 언어 목록 ['en', 'ja', 'zh']
  - available_type ENUM: PHONE/VISIT/BOTH
    * PHONE: 전화 통역만
    * VISIT: 동행 통역만
    * BOTH: 둘 다 가능
  - hourly_rate INT (시간당 요금 KRW)
  - rating DECIMAL, review_count
  - is_available BOOLEAN (현재 가용 여부)
  - created_at

interpretation_bookings 테이블 (통역 예약):
  - booking_id (PK)
  - reservation_id (FK → reservations)
  - interpreter_id (FK → interpreters)
  - type ENUM: PHONE/VISIT
  - scheduled_at DATETIME
  - duration_hours DECIMAL
  - total_fee INT
  - status ENUM: PENDING/CONFIRMED/DONE/CANCELLED

## 구현할 API

### GET /api/interpreters/available — 가용 통역사 조회
  쿼리 파라미터:
  - language: en|ja|zh (필수)
  - type: PHONE|VISIT (선택)
  - date: 희망 날짜 (선택)
  가용한 통역사 목록 + 시간당 요금 반환

### POST /api/interpreters/book — 통역 예약
  - JWT 인증 필수
  - 입력: reservation_id, interpreter_id, type, scheduled_at, duration_hours
  - 통역사에게 푸시 알림 발송
  - 결제는 Stripe로 처리 (예약금과 동일 흐름)

### GET /api/interpreters/my — 내 통역 예약 목록

### POST /api/interpreters/:id/review — 통역사 리뷰

## 관리자 기능
POST /api/admin/interpreters — 통역사 등록
  - 초기엔 수동으로 통역사 DB 구축
  - 향후 통역사 자체 가입 기능으로 확장 가능

한국어 주석 포함.
```

### 프롬프트 17-B: 모바일 앱 통역 예약 화면

```
@mobile-foreign/src/screens/InterpreterScreen.tsx 를 만들어줘.

## 화면 구성

1. 통역 서비스 소개
   - '언어 걱정 없이 진료받으세요' 헤더
   - 서비스 타입 선택:
     📞 전화 통역 (무료~저렴, 당일 가능)
     🧑 동행 통역 (유료, 사전 예약 필요)

2. 전화 통역 선택 시
   - 병원 예약 번호 + 통역사 3자 통화 연결 안내
   - '통역사 연결하기' 버튼 → 대기 중인 통역사 자동 배정
   - 예상 대기 시간 표시

3. 동행 통역 선택 시
   - 가용 통역사 카드 목록 (사진, 언어, 평점, 요금/시간)
   - 통역사 클릭 → 상세 (경력, 전문 분야, 리뷰)
   - '예약하기' 버튼 → 날짜/시간/시간 선택 → 결제

4. 예약 완료 화면
   - 통역사 연락처 제공
   - 병원 예약과 연동 표시

i18n 적용 (선택 언어 기준).
한국어 주석 포함.
```

---

## STEP 18 — 의료관광 가이드 콘텐츠

> 외국인 환자가 한국에서 성형·미용 시술을 받는 데 필요한 실용 정보를 제공하는 기능이에요.
> 앱의 체류 시간을 늘리고 신뢰도를 높이는 핵심 콘텐츠 섹션입니다.

### 프롬프트 18-A: 가이드 콘텐츠 백엔드

```
의료관광 가이드 콘텐츠 기능을 만들어줘.
backend/src/controllers/guide.js 와 DB 테이블을 생성해줘.

## DB 테이블

guide_articles 테이블:
  - article_id (PK)
  - category ENUM: VISA/RECOVERY/TRANSPORT/ACCOMMODATION/INSURANCE/PROCEDURE
  - title_ko, title_en, title_ja, title_zh
  - content_ko, content_en, content_ja, content_zh (TEXT)
  - thumbnail_url
  - tags (JSONB)
  - view_count
  - is_published BOOLEAN
  - published_at, updated_at

recovery_houses 테이블 (회복 숙소):
  - house_id (PK)
  - name, address, lat, lng
  - description_ko, description_en, description_ja, description_zh
  - price_per_night INT (KRW)
  - amenities (JSONB) — ['wifi', 'nursing', 'airport_shuttle', ...]
  - photos (JSONB)
  - contact_phone, contact_url
  - rating, review_count
  - is_active BOOLEAN

## 구현할 API

### GET /api/guide/articles — 가이드 목록
  쿼리: category, lang (언어별 필드 반환)

### GET /api/guide/articles/:id — 가이드 상세

### GET /api/guide/recovery-houses — 회복 숙소 목록
  쿼리: lat, lng (위치 기반 정렬)

### GET /api/guide/checklist — 의료관광 체크리스트
  언어별로 '시술 전/당일/시술 후' 체크리스트 반환
  예시 항목:
  - 여권/비자 확인
  - 여행 보험 가입
  - 시술 전 금식 여부 확인
  - 회복 숙소 예약
  - 귀국 항공편 여유 일정 확인

## 초기 콘텐츠 (Seed Data)
위 테이블에 아래 카테고리별 기본 가이드 데이터를 영문으로 작성해줘:
  - 비자: 의료 목적 방한 시 비자 필요 여부 (국가별)
  - 회복: 시술별 회복 기간 가이드 (코/눈/지방흡입 등)
  - 교통: 인천공항 → 강남 이동 방법
  - 보험: 외국인이 사용 가능한 여행 보험 정보

한국어 주석 포함.
```

### 프롬프트 18-B: 가이드 탭 화면

```
@mobile-foreign/src/screens/GuideScreen.tsx 를 만들어줘.
외국인 의료관광 가이드 탭 메인 화면이야.

## 화면 구성

1. 상단 배너
   - '한국 의료관광 완벽 가이드' (선택 언어)
   - 내 여행 일정 표시 (온보딩에서 입력한 입출국일)
   - 'D-7 시술까지 준비 체크리스트' 알림 배너

2. 카테고리 가로 스크롤
   ✈️ 비자/입국 | 🏥 시술 가이드 | 🏨 회복 숙소 | 🚇 교통 | 💊 보험 | ✅ 체크리스트

3. 추천 아티클 카드 (선택 카테고리 기준)
   - 썸네일 + 제목 + 예상 읽기 시간

4. 회복 숙소 섹션
   - 지도 + 숙소 카드 3개
   - '더보기' → RecoveryHouseListScreen

5. 체크리스트 섹션
   - '시술 전 준비' 체크리스트
   - 완료한 항목 체크 (AsyncStorage에 저장)
   - 진행률 프로그레스 바

API:
- GET /api/guide/articles?lang=en (선택 언어 적용)
- GET /api/guide/checklist?lang=en
- GET /api/guide/recovery-houses?lat=...&lng=...

i18n 적용.
한국어 주석 포함.
```

### 프롬프트 18-C: 회복 숙소 화면

```
@mobile-foreign/src/screens/RecoveryHouseScreen.tsx 를 만들어줘.

## 화면 구성

1. 지도 뷰 (react-native-maps)
   - 회복 숙소 마커 표시
   - 클릭 시 미니 카드 팝업

2. 숙소 카드 리스트
   - 사진 슬라이더
   - 이름, 위치, 1박 요금 (KRW + 선택 통화)
   - 편의시설 아이콘: WiFi, 간호 서비스, 공항 셔틀, 외국어 지원
   - 별점 + 리뷰 수
   - '예약 문의' 버튼 → 외부 링크 또는 인앱 채팅

3. 필터
   - 간호 서비스 있음
   - 공항 셔틀 있음
   - 영어 가능 스태프

가격은 KRW + 선택 통화 병행 표시.
i18n 적용.
```

---

## STEP 19 — 외국인 전용 병원 대시보드 기능

> 병원이 외국인 환자를 더 잘 관리할 수 있는 기능을 대시보드에 추가하는 단계예요.

### 프롬프트 19-A: 외국인 환자 관리 기능 추가

```
@dashboard/src/pages/PatientsPage.tsx 에 외국인 환자 관리 기능을 추가해줘.

## 추가할 기능

1. 환자 목록 탭 분리
   '전체 환자' | '외국인 환자' 탭 추가
   외국인 환자 = users 테이블의 preferred_language != 'ko' 기준

2. 외국인 환자 카드 추가 정보
   - 국적 국기 이모지
   - 사용 언어
   - 통역사 배정 여부
   - 한국 체류 기간 (입/출국일)
   - 예약금 결제 여부 (Stripe)

3. 다국어 상담 채팅 표시
   - 채팅 목록에서 외국인 채팅 구분 (국기 표시)
   - 채팅창에 '번역 보기' 버튼 (DeepL API로 한국어 번역)
   - 자주 쓰는 답변 템플릿 (영/일/중 번역 포함):
     * '예약이 확정되었습니다'
     * '이 시술의 회복 기간은 약 N일입니다'
     * '시술 전 금식이 필요합니다'
     * '통역사를 배정해드리겠습니다'

4. 외국인 통계 추가
   AnalyticsPage에 섹션 추가:
   - 외국인 환자 국적 분포 (파이 차트)
   - 월별 외국인 환자 수 추이
   - 외국인 환자 평균 예약금 회수율

API:
- GET /api/patients?type=foreign
- POST /api/chats/:room_id/translate (DeepL API)

한국어 주석 포함.
```

### 프롬프트 19-B: 병원 외국인 친화 인증 기능

```
병원이 '외국인 친화 병원' 인증을 받을 수 있는 기능을 추가해줘.

## 백엔드

### hospitals 테이블에 컬럼 추가
- foreign_friendly BOOLEAN DEFAULT FALSE
- languages_supported (JSONB) — ['en', 'ja', 'zh']
- has_interpreter BOOLEAN DEFAULT FALSE
- accepts_foreign_insurance BOOLEAN DEFAULT FALSE
- foreign_patient_ratio DECIMAL (외국인 환자 비율 %)

### POST /api/hospitals/:id/foreign-certification — 외국인 친화 신청
  조건 자동 체크:
  - 영문 병원 정보 입력 완료 여부
  - 외국인 환자 최소 5명 이상 보유 여부
  - 영문 리뷰 최소 3개 이상 여부
  조건 충족 시 foreign_friendly: true 자동 설정

### GET /api/hospitals/search 수정
  foreign_only=true 쿼리 파라미터 추가:
  외국인 앱에서 기본값으로 foreign_friendly=true 병원 우선 노출

## 대시보드 UI

@dashboard/src/pages/ProfilePage.tsx 에 추가:
  '외국인 친화 병원 인증' 섹션:
  - 현재 인증 여부 + 인증 배지
  - 미인증 시: 충족 조건 체크리스트 표시
  - 충족 조건 클릭 시 해당 설정 화면으로 이동
  - 인증 완료 시: 외국인 앱 노출 우선순위 상승 안내

한국어 주석 포함.
```

---

## 🔧 Phase 3 작업 중 자주 쓰는 프롬프트

### i18n 번역 키 누락됐을 때
```
앱 실행 중 i18n 번역 키가 누락되어 키 이름이 그대로 표시돼.
@mobile-foreign/src/locales/ 폴더의 en, ja, zh 번역 파일에
누락된 키를 추가해줘. 누락 키: [키 이름 복붙]
```

### Stripe 결제 오류 날 때
```
Stripe 결제 처리 중 오류가 발생했어. 에러: [에러 복붙]
백엔드 stripePayments.js 와 Stripe 웹훅 설정을 점검하고 수정해줘.
Stripe 테스트 카드 번호: 4242 4242 4242 4242 로 재테스트해줘.
```

### 환율 변환이 이상할 때
```
@backend/src/services/exchangeRate.js 에서 환율 변환 결과가 이상해.
Redis 캐시를 초기화하고 환율 API 응답을 직접 출력해서 확인해줘.
```

### 번역 품질이 나쁠 때
```
DeepL 자동 번역 결과 중 어색한 부분이 있어.
@backend/src/locales/en/common.json 에서 아래 키의 번역을
수동으로 수정해줘: [키와 원하는 번역 입력]
```

---

## Stripe 테스트 카드 번호 (실제 결제 없음)

| 상황 | 카드 번호 | 설명 |
|------|-----------|------|
| 결제 성공 | `4242 4242 4242 4242` | 모든 통화 정상 처리 |
| 결제 실패 | `4000 0000 0000 0002` | 카드 거절 테스트 |
| 3D Secure | `4000 0025 0000 3155` | 본인인증 추가 테스트 |
| 한도 초과 | `4000 0000 0000 9995` | 한도 부족 테스트 |

> 유효기간: 아무 미래 날짜 (예: 12/34), CVC: 아무 3자리

---

## Stripe 실서비스 전환 절차

```
개발 완료   →   Stripe 대시보드에서 사업자 정보 입력
             →   한국 사업자등록번호 + 대표자 정보
             →   출금 계좌 등록 (외화 정산 계좌 필요)
심사 완료   →   라이브 키로 전환 (STRIPE_SECRET_KEY 교체)
정산 주기   →   결제 후 2영업일 내 원화 환산 후 등록 계좌로 입금
수수료      →   Stripe 기본 2.9% + $0.30/건
             →   해외 카드는 추가 1.5% 부과 가능
```

---

## 📅 Phase 3 완료 후 — 운영 단계 주요 과제

| 과제 | 내용 |
|------|------|
| SEO / ASO | 외국인 대상 앱스토어 최적화 (영/일/중 키워드) |
| 해외 마케팅 | 중국 웨이보/샤오홍슈, 일본 인스타그램 광고 |
| 현지 파트너십 | 중국 So-Young, 일본 뷰티 인플루언서 협업 |
| 의료관광 협회 | 한국의료관광협회 등록 + 인증 획득 |
| 고객센터 | 24시간 다국어 채팅 지원 (초기엔 AI 챗봇 활용) |

---

*© 2025 뷰티케어 플랫폼 — Phase 3 프롬프트 가이드*
