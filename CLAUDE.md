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
