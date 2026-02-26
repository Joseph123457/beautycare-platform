# 💻 뷰티케어 플랫폼 — Claude Code 단계별 프롬프트 가이드

> 각 STEP의 프롬프트 박스 내용을 **그대로 복사 → Claude Code 터미널에 붙여넣기** 하세요.  
> 한 STEP이 완전히 끝난 후 다음 STEP으로 넘어가세요. **순서가 중요합니다.**

---

## ⚙️ 시작 전 준비 (최초 1회)

### Claude Code 설치

```bash
# 1. Node.js 설치 확인 (없으면 nodejs.org에서 LTS 다운로드)
node -v   # v22.x.x 숫자가 나오면 OK

# 2. Claude Code 설치
npm install -g @anthropic-ai/claude-code

# 3. 실행 (처음엔 로그인 창이 열림)
claude
```

### 자주 쓰는 명령어

| 명령어 | 설명 |
|--------|------|
| `claude` | Claude Code 시작 |
| `/init` | 프로젝트 CLAUDE.md 자동 생성 |
| `/clear` | 대화 기록 초기화 (새 작업 시작할 때) |
| `/compact` | 맥락 압축 (대화가 길어졌을 때) |
| `Escape` | Claude 응답 중단 |
| `Escape × 2` | 이전 메시지 목록으로 이동 |
| `@파일명` | 특정 파일을 Claude에게 참조시킬 때 |

---

## STEP 0 — 프로젝트 폴더 생성 및 CLAUDE.md 설정

> Claude에게 이 프로젝트가 무엇인지 알려주는 설정 파일을 만드는 단계예요.  
> CLAUDE.md는 매 세션마다 자동으로 읽혀서 맥락을 유지해줍니다.

### ① Claude Code 실행 전 — 터미널에서 폴더 먼저 만들기

```bash
mkdir beautycare-platform
cd beautycare-platform
claude
```

### ② Claude Code에 붙여넣기

```
아래 내용으로 이 프로젝트의 CLAUDE.md 파일을 만들어줘.

# 뷰티케어 플랫폼 (BeautyCare Platform)

## 프로젝트 개요
성형·미용 병원과 환자를 연결하는 플랫폼.
강남언니·바비톡의 '광고비=노출' 구조 대신, 리뷰 품질과 위치 기반
공정 노출 알고리즘을 핵심 차별점으로 한다.

## 구조
- backend/     : Node.js + Express API 서버
- mobile/      : React Native 환자용 앱
- dashboard/   : React.js 병원 관리 대시보드
- database/    : PostgreSQL 스키마 및 마이그레이션

## 기술 스택
- Backend: Node.js, Express, PostgreSQL, Redis, JWT
- Mobile: React Native (Expo)
- Dashboard: React.js, TypeScript, Tailwind CSS
- Maps: Kakao Maps API
- Push: Firebase FCM + 카카오 알림톡
- Payment: 토스페이먼츠

## 코딩 규칙
- 모든 코드에 한국어 주석 포함
- API 응답은 { success, data, message } 형태로 통일
- 에러 처리는 반드시 try-catch로
- 환경변수는 .env 파일 사용 (코드에 직접 쓰지 않음)

## 주요 명령어
cd backend && npm run dev    # 백엔드 서버 시작
cd mobile && npx expo start  # 모바일 앱 시작
cd dashboard && npm start    # 대시보드 시작
```

### ✅ 완료 확인
터미널에 `ls` 입력 → `CLAUDE.md` 파일이 보이면 완료!

---

## STEP 1 — 백엔드 프로젝트 뼈대 생성

> 앱의 두뇌인 백엔드 서버를 만드는 단계예요.  
> 이 서버가 모바일 앱과 대시보드에 데이터를 제공합니다.

### Claude Code에 붙여넣기

```
Node.js + Express로 뷰티케어 플랫폼 백엔드를 만들어줘.
backend/ 폴더 안에 아래 구조로 만들어줘.

backend/
├── src/
│   ├── app.js              # Express 앱 설정
│   ├── server.js           # 서버 시작 파일
│   ├── config/
│   │   ├── database.js     # PostgreSQL 연결
│   │   └── env.js          # 환경변수 관리
│   ├── routes/
│   │   ├── auth.js         # 로그인/회원가입
│   │   ├── hospitals.js    # 병원 CRUD
│   │   ├── reviews.js      # 리뷰 CRUD
│   │   └── reservations.js # 예약 CRUD
│   ├── controllers/        # 각 라우트의 비즈니스 로직
│   ├── models/             # DB 쿼리 함수
│   ├── middlewares/
│   │   ├── auth.js         # JWT 인증 미들웨어
│   │   └── errorHandler.js # 에러 처리
│   └── utils/
│       └── response.js     # API 응답 형식 통일
├── .env.example            # 환경변수 샘플
├── package.json
└── README.md

요구사항:
- 모든 파일에 한국어 주석 포함
- API 응답은 { success: true/false, data: {}, message: '' } 형식으로 통일
- CORS 설정 포함 (개발 환경에서 모든 출처 허용)
- Helmet으로 보안 헤더 설정
- Morgan으로 요청 로그 출력
- 포트는 .env의 PORT 값 사용 (기본값 3000)
```

### ✅ 완료 후 실행 확인

```bash
cd backend
npm install
cp .env.example .env
npm run dev
# → "Server running on port 3000" 메시지가 나오면 성공!
```

---

## STEP 2 — 데이터베이스 설계 및 테이블 생성

> PRD에 설계한 DB 구조를 실제 PostgreSQL 데이터베이스에 만드는 단계예요.

### Claude Code에 붙여넣기

```
뷰티케어 플랫폼의 PostgreSQL 데이터베이스 스키마를 만들어줘.
database/migrations/ 폴더에 아래 파일들을 생성해줘.

001_create_users.sql — 사용자 테이블
  - user_id (PK, BIGSERIAL)
  - email (UNIQUE, NOT NULL)
  - phone (UNIQUE)
  - password_hash
  - name, gender, birth_date
  - preferred_regions (JSONB) — 선호 지역 최대 3개
  - push_token, created_at, is_active

002_create_hospitals.sql — 병원 테이블
  - hospital_id (PK, BIGSERIAL)
  - owner_user_id (FK → users)
  - name, category (ENUM: 성형외과/피부과/치과/안과)
  - address, lat, lng (DECIMAL — 위도/경도)
  - description, operating_hours (JSONB)
  - profile_score, avg_rating, review_count, response_rate (캐시 필드)
  - subscription_tier (ENUM: FREE/BASIC/PRO), is_verified
  - PostGIS 없이 lat/lng 기반 거리 계산 가능하게 인덱스 설정

003_create_reviews.sql — 리뷰 테이블
  - review_id, hospital_id (FK), user_id (FK), reservation_id (FK)
  - rating (1~5), content, photo_urls (JSONB)
  - is_approved (기본값 false — 관리자 승인 후 공개)
  - helpful_count, is_random_eligible (기본값 true)
  - created_at

004_create_reservations.sql — 예약 테이블
  - reservation_id, hospital_id (FK), user_id (FK)
  - treatment_name, reserved_at
  - status (ENUM: PENDING/CONFIRMED/CANCELLED/DONE)
  - memo (환자 요청), staff_memo (직원 내부 메모), created_at

005_create_subscriptions.sql — 구독 테이블
  - sub_id, hospital_id (FK)
  - tier (ENUM: FREE/BASIC/PRO), price
  - started_at, expires_at, auto_renew, payment_method

006_seed_data.sql — 테스트용 더미 데이터
  - 서울 주요 구(강남, 서초, 마포, 종로, 홍대)에 병원 각 2개씩 총 10개
  - 테스트 환자 계정 5개
  - 각 병원당 리뷰 3개 (is_approved=true)

모든 파일에 한국어 주석 포함.
각 파일 상단에 실행 방법 주석 추가.
```

### ✅ 완료 후 DB에 적용

```bash
# PostgreSQL 설치 후 (postgresql.org에서 무료 다운로드)
createdb beautycare_db

# 마이그레이션 파일 순서대로 실행
psql beautycare_db -f database/migrations/001_create_users.sql
psql beautycare_db -f database/migrations/002_create_hospitals.sql
psql beautycare_db -f database/migrations/003_create_reviews.sql
psql beautycare_db -f database/migrations/004_create_reservations.sql
psql beautycare_db -f database/migrations/005_create_subscriptions.sql
psql beautycare_db -f database/migrations/006_seed_data.sql
```

---

## STEP 3 — 핵심 API: 병원 탐색 + 공정 노출 알고리즘

> 이 플랫폼의 가장 중요한 차별점인 **공정 노출 알고리즘**을 실제 코드로 구현하는 단계예요.  
> 광고비가 아닌 리뷰 품질 + 위치 + 랜덤 부스트로 노출 순위를 결정합니다.

### Claude Code에 붙여넣기

```
backend/src/controllers/hospitals.js 와 backend/src/routes/hospitals.js 를 만들어줘.

## 구현할 API 엔드포인트

### 1. GET /api/hospitals/search — 위치 기반 병원 검색
쿼리 파라미터:
  - lat, lng: 현재 위치 (필수)
  - radius: 검색 반경 km (기본값: 5)
  - category: 성형외과|피부과|치과|안과 (선택)
  - page, limit: 페이지네이션 (기본: page=1, limit=20)

공정 노출 알고리즘 (아래 점수 합산으로 정렬):
  score =
    (avg_rating / 5 * 30)           ← 리뷰 평점 가중치 30%
    + (response_rate / 100 * 20)    ← 응답률 가중치 20%
    + (profile_score / 100 * 10)    ← 프로필 완성도 10%
    + (거리 점수 * 20)              ← 가까울수록 높음, 최대 1.0
    + (Math.random() * 20)          ← 랜덤 부스트 20% (매 요청마다 다름)

  → 이 score로 정렬하여 반환 (광고비 반영 없음)

응답에 포함할 것:
  - 병원 기본 정보, 거리(km), 노출 점수 breakdown
  - 최근 리뷰 1개 미리보기

### 2. GET /api/hospitals/:id — 병원 상세 조회
  - 병원 전체 정보
  - 시술 목록
  - 최근 리뷰 5개 (랜덤 순서로)
  - 이번 주 예약 가능 여부

### 3. GET /api/hospitals/categories — 시술 카테고리 목록 반환

## 요구사항
- 한국어 주석 상세히 작성
- Haversine 공식으로 거리 계산 (PostGIS 없이)
- 에러 케이스 처리 (위치 정보 없음, 병원 없음 등)
- 응답 형식: { success: true, data: [...], meta: { total, page } }
```

### ✅ 완료 후 랜덤 노출 테스트

```
GET /api/hospitals/search?lat=37.5172&lng=127.0473&radius=3 의 결과를
curl로 3번 반복 요청해서 랜덤 부스트가 작동하는지 (순서가 바뀌는지) 확인해줘.
```

---

## STEP 4 — 인증 API + 리뷰 시스템

> 회원가입/로그인과 리뷰 시스템을 만드는 단계예요.  
> **예약 완료 환자만 리뷰 작성 가능**하게 해서 가짜 리뷰를 원천 차단합니다.

### 프롬프트 4-A: 인증 시스템

```
backend/src/controllers/auth.js 와 관련 파일들을 만들어줘.

## 구현할 API

### POST /api/auth/signup — 일반 회원가입
  - 입력: email, password, name, phone
  - password는 bcrypt로 해시 후 저장
  - 이메일 중복 체크
  - 성공 시 JWT access token + refresh token 반환

### POST /api/auth/login — 로그인
  - 이메일/비밀번호 검증
  - JWT 토큰 반환 (access: 1일, refresh: 30일)

### POST /api/auth/kakao — 카카오 소셜 로그인
  - 카카오 access token 받아서 사용자 정보 조회
  - DB에 없는 사용자면 자동 가입 처리
  - JWT 반환

### POST /api/auth/refresh — 토큰 갱신
### POST /api/auth/logout — 로그아웃

## 미들웨어: middlewares/auth.js
  - Authorization: Bearer {token} 헤더 검증
  - 유효하지 않은 토큰 → 401 에러 반환
  - req.user에 사용자 정보 주입

한국어 주석 포함.
.env에서 JWT_SECRET, KAKAO_APP_KEY 환경변수 사용.
```

### 프롬프트 4-B: 리뷰 시스템

```
backend/src/controllers/reviews.js 를 만들어줘.

## 구현할 API

### POST /api/reviews — 리뷰 작성
  - JWT 인증 필수
  - reservation_id를 받아서 아래 3가지 검증:
    1. 해당 예약이 이 사용자 것인지
    2. 예약 status가 DONE인지
    3. 이미 리뷰를 작성한 예약인지 (중복 방지)
  - 검증 통과 시에만 리뷰 저장 (is_approved: false로 저장)
  - 사진은 URL 배열로 받기

### GET /api/hospitals/:id/reviews — 병원 리뷰 목록
  - 쿼리 파라미터: sort=latest|random|helpful
  - sort=random 일 때: is_random_eligible=true인 리뷰를
    PostgreSQL의 ORDER BY RANDOM() 으로 반환
  - is_approved=true인 리뷰만 반환
  - 페이지네이션 지원

### POST /api/reviews/:id/helpful — 도움돼요 누르기
  - 같은 사용자 중복 클릭 방지

한국어 주석 상세 포함.
리뷰 작성 실패 시 구체적인 에러 메시지 반환.
```

---

## STEP 5 — 병원 관리 대시보드 (React.js 웹)

> 병원 원장님이 사용하는 웹 대시보드를 만드는 단계예요.

### 프롬프트 5-A: 대시보드 뼈대 생성

```
dashboard/ 폴더에 React.js + TypeScript 병원 관리 대시보드를 만들어줘.
Create React App 대신 Vite를 사용해줘.

폴더 구조:
dashboard/
├── src/
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx       # 홈 대시보드
│   │   ├── Reservations.tsx    # 예약 관리
│   │   └── Reviews.tsx         # 리뷰 관리
│   ├── components/
│   │   ├── Layout.tsx          # 사이드바 + 헤더 레이아웃
│   │   ├── StatCard.tsx        # 지표 카드 컴포넌트
│   │   └── ReservationList.tsx
│   ├── hooks/
│   │   └── useAuth.ts          # 로그인 상태 관리
│   ├── api/
│   │   └── client.ts           # axios 기본 설정
│   └── App.tsx

디자인 요구사항:
- Tailwind CSS 사용
- 메인 컬러: 파란색 #1E5FA8, 강조 주황색 #E8772E
- 사이드바: 로고, 메뉴(대시보드/예약/리뷰), 로그아웃 버튼
- 모바일 반응형 (사이드바 햄버거 메뉴)

한국어 UI 텍스트 사용.
```

### 프롬프트 5-B: 예약 관리 화면

```
@dashboard/src/pages/Reservations.tsx 파일을 아래 기능으로 완성해줘.

기능:
1. 탭 구성: '오늘 예약' | '전체 예약' | '취소된 예약'
2. 예약 카드에 표시: 시간, 환자 이름, 시술명, 상태 배지
3. 확정 버튼 → status: PENDING → CONFIRMED 변경 API 호출
4. 취소 버튼 → 취소 사유 입력 모달 → CANCELLED 처리
5. 완료 처리 버튼 → DONE으로 변경

API 연동:
- GET /api/hospitals/:id/reservations?status=PENDING&date=today
- PATCH /api/reservations/:id/status

상태별 배지 색상:
- PENDING(대기중): 노란색
- CONFIRMED(확정): 파란색
- DONE(완료): 초록색
- CANCELLED(취소): 회색

로딩 중 스켈레톤 UI 표시, 에러 시 토스트 메시지 표시.
```

### 프롬프트 5-C: 리뷰 관리 화면

```
@dashboard/src/pages/Reviews.tsx 파일을 아래 기능으로 완성해줘.

기능:
1. 리뷰 목록 (최신순 정렬)
2. 각 리뷰 카드: 작성자명, 별점, 내용, 작성일, 승인 여부
3. 승인 대기 리뷰에 '승인' 버튼 → is_approved: true로 변경
4. 공개 답변 작성 버튼 → 답변 입력 텍스트박스 펼치기 → 저장
5. 별점 분포 차트 (1~5점 각각 몇 개인지 막대 그래프)
6. 키워드 요약 (가장 많이 등장한 단어 Top 5 표시)

API 연동:
- GET /api/hospitals/:id/reviews?page=1
- PATCH /api/reviews/:id/approve
- POST /api/reviews/:id/reply

한국어 텍스트, Tailwind CSS 사용.
```

---

## STEP 6 — 환자용 모바일 앱 (React Native)

> 환자가 직접 쓰는 모바일 앱을 만드는 단계예요.  
> Expo를 사용해서 iOS와 Android를 동시에 개발하고, 스마트폰에서 바로 테스트할 수 있어요.

### 프롬프트 6-A: 앱 뼈대 생성

```
mobile/ 폴더에 React Native (Expo) 환자용 앱을 만들어줘.
아래 명령어로 시작해줘:
npx create-expo-app mobile --template blank-typescript

화면 구조 (React Navigation 탭 + 스택):

탭 네비게이터:
├── 홈 탭 (🏠) → HomeScreen
├── 탐색 탭 (🔍) → SearchScreen
├── 예약 탭 (📅) → MyReservationsScreen
└── 마이 탭 (👤) → ProfileScreen

스택 네비게이터 (탭 위에 올라가는 화면들):
├── HospitalDetailScreen  # 병원 상세
├── ReviewListScreen      # 리뷰 전체보기
└── BookingScreen         # 예약하기

설치할 패키지:
- @react-navigation/native
- @react-navigation/bottom-tabs
- @react-navigation/stack
- expo-location (GPS 위치)
- react-native-maps (지도)
- axios (API 통신)

디자인: 메인 파란색 #1E5FA8, 강조 주황색 #E8772E
한국어 텍스트 사용.
```

### 프롬프트 6-B: 홈 화면

```
@mobile/src/screens/HomeScreen.tsx 를 아래 기능으로 만들어줘.

화면 구성:
1. 상단 헤더: '내 주변 병원 찾기' + 현재 위치명 표시
2. 카테고리 가로 스크롤 버튼: 전체 | 성형외과 | 피부과 | 치과 | 안과
3. 병원 카드 FlatList (세로 스크롤):
   - 병원 사진 썸네일
   - 병원명, 카테고리 배지
   - 별점 + 리뷰 수
   - 거리 표시 (예: '1.2km')
   - 최근 리뷰 한 줄 미리보기
   - '예약하기' 버튼
4. 하단 고정: '지도로 보기' 버튼 → MapScreen으로 이동

API 연동:
- 앱 시작 시 expo-location으로 GPS 위치 자동 획득
- GET /api/hospitals/search?lat=...&lng=...&category=...
- 카테고리 변경 시 자동 재요청
- 풀다운 새로고침 (RefreshControl) 지원

추가 처리:
- 로딩 중: 스켈레톤 카드 3개 표시
- 위치 권한 거부 시: 안내 모달 표시
- 병원 카드 클릭 → HospitalDetailScreen으로 이동
```

### 프롬프트 6-C: 병원 상세 + 예약 화면

```
아래 두 화면을 만들어줘.

## HospitalDetailScreen.tsx
표시할 정보:
- 병원 사진 슬라이더 (swipe 가능)
- 병원명, 카테고리, 별점, 리뷰 수
- 운영시간, 주소, 거리
- 시술 목록 (이름 + 가격)
- 리뷰 미리보기 3개 (더보기 버튼 → ReviewListScreen)
- 하단 고정 버튼: '예약하기' → BookingScreen으로 이동

API: GET /api/hospitals/:id

## BookingScreen.tsx
예약 흐름:
1. 시술 선택 (드롭다운)
2. 날짜 선택 (달력 UI)
3. 시간 선택 (가능한 시간대 버튼 목록)
4. 요청 메모 입력 (선택사항)
5. 예약 확인 모달 → 확정 버튼

API: POST /api/reservations
성공 시: '예약이 완료되었습니다' 토스트 + 홈으로 이동
```

---

## STEP 7 — 통합 테스트 + 배포 준비

> 모든 기능을 연결하고 테스트한 후 배포 준비를 하는 단계예요.

### 프롬프트 7-A: API 테스트 자동화

```
backend/ 폴더에 Jest를 이용한 API 자동화 테스트를 만들어줘.
테스트 파일 위치: backend/tests/

1. hospitals.test.js:
   - 위치 기반 검색 API 정상 동작 확인
   - 같은 위치로 3번 검색 시 순서가 다른지 확인 (랜덤 부스트 검증)
   - 카테고리 필터 작동 확인
   - 없는 병원 ID 조회 시 404 반환 확인

2. auth.test.js:
   - 회원가입 → 로그인 → 토큰 검증 전체 흐름 테스트
   - 중복 이메일 가입 시 409 에러 반환
   - 잘못된 비밀번호 로그인 시 401 에러 반환

3. reviews.test.js:
   - 예약 완료(DONE) 사용자만 리뷰 작성 가능 확인
   - 예약 없는 사용자 리뷰 작성 시 403 에러 반환
   - 랜덤 순서 조회 시 매번 다른 순서 반환 확인

테스트 DB는 .env의 TEST_DATABASE_URL 환경변수 사용.
한국어 주석과 테스트 설명 포함.
package.json에 "test": "jest" 스크립트 추가.
```

### 프롬프트 7-B: Docker 배포 설정

```
프로젝트 루트에 Docker 배포 설정 파일들을 만들어줘.

1. backend/Dockerfile
   - Node.js 18 Alpine 이미지 사용
   - 프로덕션 빌드 최적화

2. docker-compose.yml (프로젝트 루트)
   services:
   - backend (포트 3000)
   - postgres (beautycare_db 자동 생성)
   - redis (캐시용)
   볼륨: DB 데이터 영구 보존
   환경변수: .env 파일 자동 연동

3. .env.production.example
   - 운영 환경용 환경변수 목록 (값은 비워두기)
   - 포함 항목: DATABASE_URL, JWT_SECRET, KAKAO_APP_KEY,
     FIREBASE_KEY, TOSS_SECRET_KEY, REDIS_URL

4. README.md 전체 업데이트
   - 로컬 개발 환경 설정 방법 (Node.js 버전 명시)
   - Docker로 전체 스택 실행하는 방법
   - 환경변수 항목별 설명
   - API 엔드포인트 목록

초보자도 따라할 수 있게 README에 단계별로 자세히 써줘.
```

---

## 🆘 막혔을 때 쓰는 프롬프트

### 에러가 났을 때
```
위 에러를 분석하고 수정해줘.
에러 메시지: [에러 내용 그대로 복사 붙여넣기]
```

### 특정 파일을 고칠 때
```
@파일경로 를 참고해서 [추가하고 싶은 기능]을 추가해줘.
```

### 코드가 이해 안 될 때
```
@파일경로 의 동작 방식을 초보자도 이해할 수 있게 한국어로 설명해줘.
```

### 대화가 너무 길어졌을 때
터미널에 `/compact` 입력 → 맥락 압축 후 계속 진행

### 완전히 새로운 작업 시작할 때
터미널에 `/clear` 입력 → 대화 기록 초기화

---

## 📅 Phase 2 예고 프롬프트 (MVP 이후)

MVP가 완성되고 실제 병원 테스트가 끝난 뒤 아래 프롬프트들을 순서대로 진행하세요.

| 단계 | 프롬프트 시작 문장 |
|------|-------------------|
| 구독 결제 | `토스페이먼츠 정기결제 API를 backend에 연동해줘. BASIC(39,000원)과 PRO(79,000원) 플랜 구독 결제 흐름을 만들어줘.` |
| 실시간 채팅 | `Socket.io로 병원-환자 실시간 채팅을 구현해줘. 텍스트 + 이미지 전송, 읽음 확인 포함.` |
| AI 리뷰 분석 | `Claude API를 연동해서 병원 리뷰를 자동 분석해줘. 긍정/부정 감성 분류, 자주 나오는 키워드 Top 10 추출.` |
| 푸시 알림 | `Firebase FCM으로 예약 확정/취소/리뷰 요청 푸시 알림을 자동 발송하는 기능을 만들어줘.` |
| 외국인 앱 | `mobile/ 앱에 다국어 지원을 추가해줘. 영어, 일본어, 중국어(간체). i18n 라이브러리 사용.` |

---

*이 문서는 개발 진행에 따라 계속 업데이트됩니다.*  
*© 2025 뷰티케어 플랫폼*
