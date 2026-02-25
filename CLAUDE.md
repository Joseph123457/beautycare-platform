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

## 완성된 기능

### Phase 1 (MVP)
- 백엔드 API: 병원 탐색, 공정 노출 알고리즘, 인증, 리뷰, 예약
- 병원 대시보드: 예약 관리, 리뷰 관리
- 환자 모바일 앱: 홈, 탐색, 병원 상세, 예약
- Docker 배포 설정 완료

### Phase 2 (완료)
- 구독 결제 (토스페이먼츠 정기결제) + 구독 플랜 기반 접근 제어
- 실시간 채팅 (Socket.io) + 대시보드 채팅 관리
- AI 리뷰 분석 (Claude API) + 감성 분석 차트, 키워드 클라우드
- 푸시 알림 자동화 (FCM + 카카오 알림톡) + 스케줄 작업
- 환자 CRM: 백엔드 API 4개 (목록/상세/메모/단체메시지) + 대시보드 환자 관리 페이지
  - patient_memos 테이블, 시술 타임라인, 재방문 주기 분석
  - FREE 플랜 3명 제한 + 블러, PRO 전용 단체 메시지 (푸시/알림톡)
- FeatureLock 컴포넌트 (플랜 기반 기능 잠금)
- 모바일: 푸시 알림 훅, 리뷰 작성 화면
- 통계 분석 대시보드 (analytics API 4개 + 대시보드 통계 페이지)

## 기술 스택
- Backend: Node.js, Express, PostgreSQL, Redis, JWT, Socket.io
- Mobile: React Native (Expo) — 두 앱 공통
- Dashboard: React.js, TypeScript, Tailwind CSS
- AI: Claude API (Anthropic)
- Push: Firebase FCM + 카카오 알림톡
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
