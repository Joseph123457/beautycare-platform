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
