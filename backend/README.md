# 뷰티케어 플랫폼 백엔드

Node.js + Express 기반 API 서버

## 실행 방법

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에서 DB 정보 등 수정

# 개발 서버 시작
npm run dev

# 프로덕션 실행
npm start
```

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/auth/signup | 회원가입 |
| POST | /api/auth/login | 로그인 |
| GET | /api/hospitals | 병원 목록 |
| GET | /api/hospitals/:id | 병원 상세 |
| POST | /api/hospitals | 병원 등록 |
| PUT | /api/hospitals/:id | 병원 수정 |
| DELETE | /api/hospitals/:id | 병원 삭제 |
| GET | /api/reviews | 리뷰 목록 |
| POST | /api/reviews | 리뷰 작성 |
| PUT | /api/reviews/:id | 리뷰 수정 |
| DELETE | /api/reviews/:id | 리뷰 삭제 |
| GET | /api/reservations | 예약 목록 |
| GET | /api/reservations/:id | 예약 상세 |
| POST | /api/reservations | 예약 생성 |
| PATCH | /api/reservations/:id/cancel | 예약 취소 |
