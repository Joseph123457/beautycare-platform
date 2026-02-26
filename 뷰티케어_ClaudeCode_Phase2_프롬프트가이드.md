# 💻 뷰티케어 플랫폼 — Phase 2 Claude Code 프롬프트 가이드

> **Phase 1 (MVP) 완료 축하드립니다! 🎉**  
> Phase 2는 구독 수익화 + 사용자 고착도를 높이는 단계입니다.  
> 각 STEP의 코드 박스를 **그대로 복사 → Claude Code 터미널에 붙여넣기** 하세요.

---

## Phase 2 전체 구성

| STEP | 기능 | 예상 소요 |
|------|------|-----------|
| STEP 8 | 구독 결제 시스템 (토스페이먼츠) | 1~2주 |
| STEP 9 | 실시간 채팅 (Socket.io) | 1주 |
| STEP 10 | AI 리뷰 분석 (Claude API) | 3~5일 |
| STEP 11 | 푸시 알림 자동화 (FCM + 카카오) | 3~5일 |
| STEP 12 | 병원 CRM — 환자 관리 고도화 | 1주 |
| STEP 13 | 통계 대시보드 고도화 | 1주 |

---

## ⚠️ Phase 2 시작 전 필수 확인

### Claude Code에 붙여넣기 (첫 번째로 실행)

```
Phase 2 작업을 시작할 준비를 해줘.
현재 프로젝트 구조를 파악하고 CLAUDE.md를 아래 내용으로 업데이트해줘.

# 뷰티케어 플랫폼 (BeautyCare Platform)

## 프로젝트 개요
성형·미용 병원과 환자를 연결하는 플랫폼.
Phase 1 (MVP) 완료 상태. Phase 2 — 구독 수익화 + 고착도 기능 추가 중.

## 현재 완성된 기능 (Phase 1)
- 백엔드 API: 병원 탐색, 공정 노출 알고리즘, 인증, 리뷰, 예약
- 병원 대시보드: 예약 관리, 리뷰 관리
- 환자 모바일 앱: 홈, 탐색, 병원 상세, 예약
- Docker 배포 설정 완료

## Phase 2 추가 예정 기능
- 구독 결제 (토스페이먼츠 정기결제)
- 실시간 채팅 (Socket.io)
- AI 리뷰 분석 (Claude API)
- 푸시 알림 자동화 (FCM + 카카오 알림톡)
- 환자 CRM 고도화
- 통계 대시보드 고도화

## 기술 스택
- Backend: Node.js, Express, PostgreSQL, Redis, JWT, Socket.io
- Mobile: React Native (Expo)
- Dashboard: React.js, TypeScript, Tailwind CSS
- AI: Claude API (Anthropic)
- Push: Firebase FCM + 카카오 알림톡
- Payment: 토스페이먼츠

## 코딩 규칙
- 모든 코드에 한국어 주석 포함
- API 응답은 { success, data, message } 형태로 통일
- 에러 처리는 반드시 try-catch로
- 환경변수는 .env 파일 사용
```

---

## STEP 8 — 구독 결제 시스템 (토스페이먼츠)

> 병원이 BASIC / PRO 플랜을 구독하고 자동 갱신되는 결제 시스템이에요.  
> 이 단계가 완성되면 **실제 수익이 발생**하기 시작합니다.

### 프롬프트 8-A: 구독 결제 백엔드

```
토스페이먼츠 정기결제 API를 백엔드에 연동해줘.
backend/src/controllers/subscriptions.js 와 backend/src/routes/subscriptions.js 를 만들어줘.

## 구독 플랜 정의
- FREE: 무료 (기본 프로필, 기본 노출)
- BASIC: 39,000원/월 (예약 관리, 환자 CRM, 월 통계)
- PRO: 79,000원/월 (AI 리뷰 분석, 실시간 채팅, 마케팅 자동화)

## 구현할 API

### POST /api/subscriptions/checkout — 구독 결제 시작
  - JWT 인증 필수 (병원 원장만 가능)
  - 입력: tier (BASIC|PRO), billing_period (monthly|yearly)
  - 토스페이먼츠 빌링키 발급 URL 반환
  - yearly 선택 시 2개월 할인 적용

### POST /api/subscriptions/confirm — 결제 확인 및 구독 활성화
  - 토스페이먼츠 webhook 수신
  - 결제 성공 시 subscriptions 테이블 업데이트
  - hospital의 subscription_tier 업데이트
  - 결제 완료 알림 이메일 발송 (nodemailer)

### POST /api/subscriptions/cancel — 구독 취소
  - 취소 사유 저장
  - 현재 구독 기간 만료일까지는 서비스 유지
  - 토스페이먼츠 정기결제 해지 API 호출

### GET /api/subscriptions/my — 내 구독 현황 조회
  - 현재 플랜, 결제일, 다음 결제 예정일, 결제 내역

### GET /api/subscriptions/plans — 플랜 목록 및 가격 조회

## 플랜별 기능 잠금 미들웨어
middlewares/subscription.js 생성:
  - requireBasic: BASIC 이상만 접근 가능
  - requirePro: PRO만 접근 가능
  - 미충족 시 { success: false, message: '이 기능은 BASIC 플랜 이상에서 사용 가능합니다' } 반환

## DB 추가 테이블
payments 테이블:
  - payment_id, hospital_id (FK), sub_id (FK)
  - amount, status (SUCCESS|FAIL|CANCEL)
  - toss_payment_key, billing_key
  - paid_at, created_at

환경변수: TOSS_SECRET_KEY, TOSS_CLIENT_KEY (.env에서 사용)
한국어 주석 상세 포함.
```

### 프롬프트 8-B: 구독 관리 대시보드 화면

```
@dashboard/src/pages/ 에 구독 관리 화면을 추가해줘.

## SubscriptionPage.tsx

화면 구성:
1. 현재 플랜 카드
   - 플랜명 (FREE/BASIC/PRO) + 배지
   - 다음 결제일 + 금액
   - '플랜 변경' / '구독 취소' 버튼

2. 플랜 비교 카드 3개 (FREE / BASIC / PRO)
   - 가격 강조 표시
   - 포함 기능 체크리스트
   - 현재 플랜에 '현재 이용 중' 배지
   - 다른 플랜에 '업그레이드' 버튼

3. 결제 내역 테이블
   - 날짜, 플랜, 금액, 상태 (성공/실패/취소)
   - PDF 영수증 다운로드 버튼

## 플랜별 기능 잠금 UI 처리
- BASIC 전용 기능에 자물쇠 아이콘 (FREE 사용자에게)
- 클릭 시 업그레이드 유도 모달 표시
- 모달 내용: 기능 설명 + '업그레이드하기' 버튼

API 연동:
- GET /api/subscriptions/my
- GET /api/subscriptions/plans
- POST /api/subscriptions/cancel

Tailwind CSS, 한국어 텍스트.
```

### ✅ 완료 후 테스트

```
토스페이먼츠 테스트 환경에서 BASIC 플랜 구독 → 결제 확인 → 구독 취소
전체 흐름을 테스트하고, 각 단계에서 DB가 올바르게 업데이트되는지 확인해줘.
토스페이먼츠 테스트 키는 .env의 TOSS_SECRET_KEY 사용.
```

---

## STEP 9 — 실시간 채팅 (Socket.io)

> 환자와 병원이 앱 안에서 바로 대화할 수 있는 채팅 기능이에요.  
> PRO 플랜 병원만 사용 가능 — 구독 업그레이드 유도에도 활용됩니다.

### 프롬프트 9-A: 채팅 백엔드 (Socket.io)

```
Socket.io로 병원-환자 실시간 채팅을 구현해줘.

## 백엔드 설정
backend/src/socket/ 폴더 생성:

chat.js — Socket.io 이벤트 핸들러:
  - 연결 시 JWT 토큰으로 사용자 인증
  - 채팅방 입장: join_room (room_id = hospital_id + user_id 조합)
  - 메시지 전송: send_message
    * 텍스트 메시지
    * 이미지 URL (S3 업로드 후 URL 전달 방식)
  - 메시지 읽음 처리: mark_read
  - 연결 해제 처리

## DB 추가 테이블
chat_rooms 테이블:
  - room_id (PK), hospital_id (FK), user_id (FK)
  - last_message, last_message_at
  - hospital_unread_count, user_unread_count
  - created_at

chat_messages 테이블:
  - message_id (PK), room_id (FK), sender_id (FK)
  - sender_type (HOSPITAL|USER)
  - content, image_url
  - is_read, created_at

## REST API (채팅 목록 조회용)

### GET /api/chats — 내 채팅방 목록
  - 병원: 모든 환자와의 채팅방 목록 + 읽지 않은 메시지 수
  - 환자: 문의한 병원 목록

### GET /api/chats/:room_id/messages — 채팅 내역 조회
  - 페이지네이션 (최신 20개씩)
  - 읽음 처리 자동 적용

### POST /api/chats/start — 새 채팅 시작
  - 환자가 병원에 첫 문의 시 채팅방 생성
  - 이미 있는 채팅방이면 기존 room_id 반환

PRO 플랜 병원만 접근 가능 (requirePro 미들웨어 적용).
Redis로 온라인 상태 관리.
한국어 주석 포함.
```

### 프롬프트 9-B: 모바일 앱 채팅 화면

```
@mobile/src/screens/ 에 채팅 화면들을 추가해줘.

## ChatListScreen.tsx — 채팅 목록
- 채팅방 목록 (병원 사진, 병원명, 마지막 메시지, 시간)
- 읽지 않은 메시지 수 빨간 뱃지
- 탭 네비게이터에 '채팅' 탭 추가 (💬)

## ChatRoomScreen.tsx — 채팅방
- 말풍선 UI (내 메시지: 오른쪽 파란색, 상대: 왼쪽 회색)
- 텍스트 입력창 + 전송 버튼
- 이미지 첨부 버튼 (expo-image-picker)
- 날짜 구분선 표시
- 읽음 확인 ('읽음' 텍스트)
- 소켓 연결: 새 메시지 실시간 수신
- 키보드 올라올 때 스크롤 자동 조정

소켓 연결은 앱 시작 시 한 번만 연결, 화면 이동해도 유지.
Socket.io client 패키지 사용.
한국어 텍스트.
```

### 프롬프트 9-C: 대시보드 채팅 화면

```
@dashboard/src/pages/ 에 채팅 관리 화면을 추가해줘.

## ChatsPage.tsx
좌우 분할 레이아웃:
  왼쪽 패널 (채팅방 목록):
  - 환자별 채팅방 리스트
  - 읽지 않은 메시지 수 뱃지
  - 마지막 메시지 미리보기
  - 검색창 (환자 이름으로 검색)

  오른쪽 패널 (채팅 내용):
  - 선택한 채팅방의 메시지 표시
  - 말풍선 UI
  - 이미지 클릭 시 확대 보기
  - 텍스트 입력 + 전송

미답변 채팅방은 상단에 고정 표시.
새 메시지 수신 시 브라우저 알림 (Notification API).
```

---

## STEP 10 — AI 리뷰 분석 (Claude API)

> 병원에 쌓인 리뷰를 AI가 자동으로 분석해서 인사이트를 제공하는 기능이에요.  
> **BASIC 플랜 이상** 병원만 사용 가능합니다.

### 프롬프트 10-A: AI 분석 백엔드

```
Claude API (Anthropic)를 연동해서 병원 리뷰 자동 분석 기능을 만들어줘.
backend/src/services/aiAnalysis.js 를 생성해줘.

## 분석 기능 1: 리뷰 감성 분석
새 리뷰가 승인될 때 자동 실행:
  - Claude API에 리뷰 텍스트 전달
  - 반환 값:
    * sentiment: positive|neutral|negative
    * score: 0~100 (긍정 점수)
    * keywords: 핵심 키워드 배열 (최대 5개)
    * summary: 한 줄 요약
  - 결과를 reviews 테이블의 ai_analysis (JSONB) 컬럼에 저장

## 분석 기능 2: 월간 리뷰 리포트 생성
POST /api/analysis/monthly-report (BASIC 이상):
  - 해당 월의 전체 리뷰를 Claude API로 분석
  - 반환 내용:
    * 이달의 강점 3가지 (가장 칭찬받은 부분)
    * 이달의 개선점 3가지 (가장 많이 지적된 부분)
    * 경쟁 우위 요소
    * 원장님께 드리는 한 줄 조언
  - 결과를 monthly_reports 테이블에 저장
  - 매월 1일 자동 실행 (node-cron 사용)

## 분석 기능 3: 키워드 트렌드
GET /api/analysis/keywords/:hospital_id (BASIC 이상):
  - 최근 3개월 리뷰에서 자주 등장한 키워드 Top 10
  - 긍정/부정 키워드 구분
  - 키워드별 언급 횟수

## Claude API 호출 규칙
- 모델: claude-opus-4-6 사용
- 응답은 항상 JSON 형식으로 요청
- 리뷰 분석 프롬프트는 한국어로 작성
- API 호출 실패 시 재시도 1회, 그래도 실패 시 에러 로그만 남기고 리뷰는 정상 저장

환경변수: ANTHROPIC_API_KEY (.env에서 사용)
한국어 주석 포함.
```

### 프롬프트 10-B: AI 분석 대시보드 화면

```
@dashboard/src/pages/Reviews.tsx 에 AI 분석 섹션을 추가해줘.

## 추가할 UI 컴포넌트

### AIInsightCard.tsx
  - 이달의 강점 3가지 (초록 체크 아이콘)
  - 이달의 개선점 3가지 (주황 화살표 아이콘)
  - AI 조언 박스 (파란 배경)
  - '리포트 새로고침' 버튼

### KeywordCloud.tsx
  - 긍정 키워드: 파란색 태그
  - 부정 키워드: 빨간색 태그
  - 크기는 언급 빈도에 비례
  - 클릭 시 해당 키워드가 포함된 리뷰만 필터링

### SentimentChart.tsx
  - 최근 3개월 감성 점수 추이 선 그래프
  - recharts 라이브러리 사용
  - 긍정/중립/부정 비율 도넛 차트

FREE 플랜 병원에게는 흐림 처리(blur) + '업그레이드하면 사용 가능' 안내.
API:
  - GET /api/analysis/monthly-report/:hospital_id
  - GET /api/analysis/keywords/:hospital_id
```

---

## STEP 11 — 푸시 알림 자동화

> 예약 확정, 리뷰 요청, 마케팅 메시지를 자동으로 발송하는 기능이에요.

### 프롬프트 11-A: FCM 푸시 알림 백엔드

```
Firebase FCM으로 모바일 푸시 알림을 구현해줘.
backend/src/services/pushNotification.js 를 생성해줘.

## 발송 시나리오별 구현

### 1. 예약 관련 알림 (환자에게)
  - 예약 확정: "[병원명] 예약이 확정되었습니다. 예약일: [날짜/시간]"
  - 예약 취소: "예약이 취소되었습니다. [취소 사유]"
  - 예약 1일 전 리마인더: "내일 [병원명] 예약이 있습니다"
  - 시술 완료 후 리뷰 요청: "[병원명] 방문 어떠셨나요? 솔직한 후기를 남겨주세요 ✍️"
    → 시술 완료(DONE) 처리 후 24시간 뒤 자동 발송

### 2. 병원 알림 (원장/직원에게)
  - 새 예약 접수: "새 예약이 접수되었습니다. [환자명] / [시술명]"
  - 새 리뷰 등록: "새 리뷰가 등록되었습니다. 확인 후 답변해주세요"
  - 미답변 문의 알림: "24시간 이상 미답변 채팅이 있습니다"

## 기술 구현
- firebase-admin SDK 사용
- users 테이블의 push_token으로 발송
- 발송 실패 시 (토큰 만료 등) push_token null로 업데이트
- 알림 발송 이력 테이블 (push_logs) 저장
- node-cron으로 스케줄 발송:
  * 매일 오전 9시: 당일 예약 리마인더
  * 매시간: 미답변 채팅 체크 (24시간 초과 시)
  * 시술 완료 후 24시간: 리뷰 요청 알림

환경변수: FIREBASE_SERVICE_ACCOUNT_KEY (.env에서 사용)
한국어 주석 포함.
```

### 프롬프트 11-B: 카카오 알림톡 연동

```
카카오 알림톡 API를 연동해줘.
backend/src/services/kakaoAlimtalk.js 를 생성해줘.

## 발송 시나리오

### 예약 확정 알림톡
템플릿:
  안녕하세요, [환자명]님!
  [병원명] 예약이 확정되었습니다.

  📅 예약일시: [날짜] [시간]
  💉 시술명: [시술명]
  📍 위치: [병원 주소]

  예약 변경/취소는 앱에서 가능합니다.

### 리뷰 요청 알림톡
템플릿:
  [병원명] 방문해 주셔서 감사합니다!
  솔직한 후기를 남겨주시면 다른 분들께 큰 도움이 됩니다.
  [리뷰 작성 딥링크]

## 구현 사항
- 카카오 비즈메시지 API 사용
- 알림톡 발송 실패 시 일반 SMS로 폴백
- 발송 이력 push_logs 테이블에 함께 저장

환경변수: KAKAO_BIZ_API_KEY, KAKAO_SENDER_KEY
한국어 주석 포함.
```

### 프롬프트 11-C: 모바일 앱 푸시 토큰 등록

```
@mobile/src/screens/ 에서 FCM 푸시 토큰을 등록하는 기능을 추가해줘.

AppInitializer.tsx 또는 App.tsx에서:
1. expo-notifications로 푸시 권한 요청
2. 권한 허용 시 FCM 토큰 발급
3. 토큰을 PATCH /api/users/push-token API로 서버에 저장
4. 앱 포그라운드 상태에서 알림 수신 시 인앱 배너로 표시
5. 알림 클릭 시 해당 화면으로 딥링크 이동:
   - 예약 알림 → MyReservationsScreen
   - 리뷰 요청 → ReviewWriteScreen (해당 예약 ID 전달)
   - 채팅 알림 → ChatRoomScreen (해당 room_id 전달)

expo-notifications 패키지 사용.
한국어 주석 포함.
```

---

## STEP 12 — 환자 CRM 고도화

> 병원이 환자를 체계적으로 관리하고 재방문을 유도하는 기능이에요.  
> **BASIC 플랜 이상**에서 사용 가능합니다.

### 프롬프트 12-A: CRM 백엔드

```
병원 환자 관리(CRM) 기능을 백엔드에 추가해줘.
backend/src/controllers/patients.js 를 생성해줘.

## 구현할 API

### GET /api/patients — 내 병원 환자 목록 (BASIC 이상)
  - 예약을 완료한 환자 전체 목록
  - 각 환자: 이름, 연락처, 총 방문 횟수, 마지막 방문일, 총 시술 금액
  - 검색: 이름/전화번호
  - 정렬: 최근 방문순 | 방문 횟수순

### GET /api/patients/:user_id — 환자 상세 (BASIC 이상)
  - 환자 기본 정보
  - 시술 이력 타임라인 (날짜, 시술명, 담당 스태프, 메모)
  - 작성한 리뷰 목록
  - 재방문 주기 분석

### PATCH /api/patients/:user_id/memo — 환자 메모 저장
  - 병원 측 내부 메모 (환자에게 비공개)
  - 메모 이력 누적 저장

### POST /api/patients/bulk-message — 단체 메시지 발송 (PRO 이상)
  - 대상: 전체 환자 | 특정 시술 환자 | 마지막 방문 N개월 이상
  - 발송 채널: 앱 푸시 | 카카오 알림톡
  - 메시지 템플릿 사용

## DB 추가
patient_memos 테이블:
  - memo_id, hospital_id (FK), user_id (FK)
  - content, created_by, created_at

BASIC 이상 미들웨어 적용.
한국어 주석 포함.
```

### 프롬프트 12-B: CRM 대시보드 화면

```
@dashboard/src/pages/ 에 환자 관리 화면을 추가해줘.

## PatientsPage.tsx

화면 구성:
1. 상단 요약 카드
   - 전체 환자 수
   - 이번 달 신규 환자
   - 재방문율 (%)
   - 평균 방문 주기

2. 환자 목록 테이블
   - 컬럼: 이름, 연락처, 방문 횟수, 마지막 방문일, 다음 예약일, 메모 아이콘
   - 클릭 시 환자 상세 사이드 패널 오픈

3. 환자 상세 사이드 패널 (오른쪽에서 슬라이드)
   - 기본 정보
   - 시술 이력 타임라인
   - 내부 메모 입력 + 이력
   - '메시지 보내기' 버튼

4. 단체 메시지 발송 모달 (PRO 전용)
   - 대상 필터 선택
   - 메시지 작성
   - 발송 채널 선택 (푸시/알림톡)
   - 예약 발송 시간 설정

FREE 플랜: 환자 목록 3명만 보이고 나머지는 흐림 처리.
```

---

## STEP 13 — 통계 대시보드 고도화

> 병원 운영에 실질적으로 도움이 되는 데이터 분석 기능이에요.

### 프롬프트 13-A: 통계 백엔드

```
병원 통계 분석 API를 만들어줘.
backend/src/controllers/analytics.js 를 생성해줘.

## 구현할 API

### GET /api/analytics/overview/:hospital_id — 전체 현황
  기간 파라미터: period=7d|30d|90d|1y
  반환 데이터:
  - 조회수 (일별 추이)
  - 예약 수 및 전환율 (조회 → 예약)
  - 매출 추정 (예약 완료 건수 × 평균 시술가)
  - 신규 환자 vs 재방문 환자 비율
  - 리뷰 평균 점수 추이

### GET /api/analytics/treatments/:hospital_id — 시술별 분석
  - 시술별 예약 수 순위
  - 시술별 평균 평점
  - 시술별 재예약율

### GET /api/analytics/time/:hospital_id — 시간대별 분석
  - 요일별 예약 분포
  - 시간대별 예약 분포 (오전/오후/저녁)
  - 최적 영업시간 추천

### GET /api/analytics/exposure/:hospital_id — 노출 분석
  - 검색 결과 노출 횟수
  - 노출 대비 클릭률
  - 알고리즘 점수 breakdown (리뷰/응답률/위치/랜덤)
  - 경쟁 병원 대비 내 점수 위치 (익명 처리)

모든 통계는 Redis에 1시간 캐시 적용.
BASIC 이상 미들웨어 적용.
한국어 주석 포함.
```

### 프롬프트 13-B: 통계 대시보드 화면

```
@dashboard/src/pages/ 에 통계 화면을 추가해줘.

## AnalyticsPage.tsx

화면 구성:
1. 상단: 기간 선택 탭 (7일 | 30일 | 90일 | 1년)

2. 핵심 지표 카드 4개 (가로 나열)
   - 총 조회수 (증감 % 표시)
   - 예약 전환율
   - 평균 평점
   - 노출 순위 (알고리즘 점수)

3. 조회수 & 예약 수 추이 그래프
   - 이중 Y축 선 그래프 (recharts)
   - 조회수: 파란선, 예약 수: 주황선

4. 시술별 인기도 바 차트

5. 요일/시간대 히트맵
   - 가장 바쁜 시간대 시각화

6. 노출 알고리즘 점수 미터
   - 내 점수 / 최고 점수 게이지
   - 항목별 점수 (리뷰/응답률/위치/프로필)
   - 점수 올리는 방법 팁 표시

recharts 라이브러리 사용.
로딩 중 스켈레톤 UI.
```

---

## 🆘 Phase 2 작업 중 자주 쓰는 프롬프트

### 소켓 연결 오류 날 때
```
Socket.io 연결 오류가 발생했어. 에러 메시지: [에러 복붙]
백엔드 socket 설정과 프론트엔드 연결 코드를 점검하고 수정해줘.
```

### 결제 API 테스트 안 될 때
```
토스페이먼츠 테스트 결제가 안 돼. 에러: [에러 복붙]
토스페이먼츠 테스트 환경 설정과 웹훅 URL 설정을 확인하고 수정해줘.
```

### Claude API 응답이 JSON이 아닐 때
```
@backend/src/services/aiAnalysis.js 에서 Claude API 응답 파싱 오류가 나.
JSON 파싱 실패 시 재시도하고, 그래도 안 되면 기본값을 반환하도록 수정해줘.
```

### 성능이 느릴 때
```
@backend/src/controllers/analytics.js 의 API 응답이 너무 느려.
Redis 캐시를 적용하고, 무거운 DB 쿼리에 인덱스를 추가해줘.
```

---

## 📅 Phase 3 예고 (외국인 타겟 앱)

Phase 2가 완성되면 공통 백엔드를 재활용해서 외국인 앱을 빠르게 구축할 수 있어요.

| 단계 | 프롬프트 시작 문장 |
|------|-------------------|
| 다국어 지원 | `mobile/ 앱에 i18n 다국어를 추가해줘. 영어, 일본어, 중국어(간체). react-i18next 사용.` |
| 외국인 전용 화면 | `외국인 의료관광 특화 화면을 추가해줘. 시술 설명 영문 번역, 예상 비용(USD/JPY/CNY 환산), 회복 기간 안내 포함.` |
| 통역 연결 | `예약 확정 후 통역사 매칭 기능을 추가해줘. 언어별 통역사 DB, 예약 시 통역 동행 옵션 선택.` |
| 해외 결제 | `Stripe를 연동해서 USD/JPY 결제를 추가해줘. 기존 토스페이먼츠와 병행 운영.` |
| 의료관광 가이드 | `외국인을 위한 한국 의료관광 가이드 콘텐츠 섹션을 앱에 추가해줘. 비자, 회복 숙소, 교통 정보 포함.` |

---

*© 2025 뷰티케어 플랫폼 — Phase 2 프롬프트 가이드*
