# BeautyCare Platform

성형·미용 병원과 환자를 연결하는 플랫폼입니다.
강남언니·바비톡의 '광고비=노출' 구조 대신, **리뷰 품질과 위치 기반 공정 노출 알고리즘**을 핵심 차별점으로 합니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Node.js 18, Express, PostgreSQL 16, Redis 7 |
| Mobile | React Native (Expo) |
| Dashboard | React.js, TypeScript, Tailwind CSS |
| 지도 | Kakao Maps API |
| 푸시 알림 | Firebase FCM + 카카오 알림톡 |
| 결제 | 토스페이먼츠 |
| 배포 | Docker, Docker Compose |

## 프로젝트 구조

```
beautycare-platform/
├── backend/                # Node.js + Express API 서버
│   ├── src/
│   │   ├── config/         # 환경변수, DB 연결 설정
│   │   ├── controllers/    # 요청 처리 로직
│   │   ├── middlewares/     # 인증, 에러 핸들러, 유효성 검사
│   │   ├── models/         # 데이터베이스 모델
│   │   ├── routes/         # API 라우트 정의
│   │   ├── utils/          # 유틸리티 함수
│   │   ├── app.js          # Express 앱 설정
│   │   └── server.js       # 서버 시작점
│   ├── Dockerfile
│   └── package.json
├── mobile/                 # React Native 환자용 앱
├── dashboard/              # React.js 병원 관리 대시보드
├── database/
│   └── migrations/         # PostgreSQL 마이그레이션 SQL 파일
├── docker-compose.yml
├── .env.production.example
└── CLAUDE.md
```

## 시작하기

### 방법 1: Docker로 실행 (권장)

Docker와 Docker Compose가 설치되어 있어야 합니다.

**1단계: 저장소 클론**

```bash
git clone <repository-url>
cd beautycare-platform
```

**2단계: 환경변수 설정**

```bash
# 예제 파일을 복사해서 실제 값을 입력합니다
cp .env.production.example backend/.env
```

`backend/.env` 파일을 열어 비밀번호와 시크릿 키를 입력합니다.
Docker 내부 네트워크에서는 `DB_HOST=postgres`, `REDIS_HOST=redis`를 사용합니다.

**3단계: 실행**

```bash
docker compose up -d
```

첫 실행 시 `database/migrations/` 폴더의 SQL 파일이 자동으로 실행되어 테이블이 생성됩니다.

**상태 확인:**

```bash
docker compose ps
```

3개 서비스(backend, postgres, redis)가 모두 running 상태인지 확인합니다.

**로그 확인:**

```bash
docker compose logs -f backend
```

**종료:**

```bash
docker compose down
```

### 방법 2: 로컬 개발 환경

**필수 설치:**
- Node.js 18 이상
- PostgreSQL 16
- Redis 7

**백엔드 실행:**

```bash
cd backend
cp ../.env.production.example .env
# .env 파일에서 DB_HOST=localhost, REDIS_HOST=localhost로 변경
npm install
npm run dev
```

**데이터베이스 마이그레이션:**

PostgreSQL이 실행 중인 상태에서 마이그레이션 SQL을 순서대로 실행합니다.

```bash
psql -U postgres -d beautycare_db -f database/migrations/001_create_users.sql
psql -U postgres -d beautycare_db -f database/migrations/002_create_hospitals.sql
# ... 나머지 파일도 번호 순서대로 실행
```

## 환경변수

| 변수명 | 설명 | 기본값 | 비고 |
|--------|------|--------|------|
| `PORT` | 서버 포트 | `3000` | |
| `NODE_ENV` | 실행 환경 | `development` | `production` / `development` |
| `DB_HOST` | PostgreSQL 호스트 | `localhost` | Docker: `postgres` |
| `DB_PORT` | PostgreSQL 포트 | `5432` | |
| `DB_NAME` | 데이터베이스 이름 | `beautycare` | Docker: `beautycare_db` |
| `DB_USER` | 데이터베이스 사용자 | `postgres` | |
| `DB_PASSWORD` | 데이터베이스 비밀번호 | | 반드시 설정 |
| `JWT_SECRET` | JWT 서명 키 | | 반드시 설정 |
| `JWT_ACCESS_EXPIRES_IN` | 액세스 토큰 만료 | `1d` | |
| `JWT_REFRESH_EXPIRES_IN` | 리프레시 토큰 만료 | `30d` | |
| `KAKAO_APP_KEY` | 카카오 앱 키 | | 소셜 로그인용 |
| `REDIS_HOST` | Redis 호스트 | `localhost` | Docker: `redis` |
| `REDIS_PORT` | Redis 포트 | `6379` | |
| `REDIS_PASSWORD` | Redis 비밀번호 | | 선택 |

## API 엔드포인트

기본 URL: `http://localhost:3000/api`

### 헬스 체크

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/health` | 서버 상태 확인 |

### 인증 (Auth)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/auth/signup` | 회원가입 | - |
| POST | `/api/auth/login` | 이메일/비밀번호 로그인 | - |
| POST | `/api/auth/kakao` | 카카오 소셜 로그인 | - |
| POST | `/api/auth/refresh` | 액세스 토큰 갱신 | - |
| POST | `/api/auth/logout` | 로그아웃 | 필요 |

### 병원 (Hospitals)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/hospitals/search` | 위치 기반 병원 검색 | - |
| GET | `/api/hospitals/categories` | 시술 카테고리 목록 | - |
| GET | `/api/hospitals/:id` | 병원 상세 조회 | - |
| GET | `/api/hospitals/:id/reviews` | 병원 리뷰 목록 | - |
| GET | `/api/hospitals/:id/reviews/dashboard` | 대시보드용 리뷰 목록 | 필요 |
| GET | `/api/hospitals/:id/reservations` | 병원 예약 목록 | 필요 |
| POST | `/api/hospitals` | 병원 등록 | 필요 |
| PUT | `/api/hospitals/:id` | 병원 수정 | 필요 |
| DELETE | `/api/hospitals/:id` | 병원 삭제 | 필요 |

### 리뷰 (Reviews)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/reviews` | 예약 기반 리뷰 작성 | 필요 |
| POST | `/api/reviews/:id/helpful` | 도움이 돼요 토글 | 필요 |
| PATCH | `/api/reviews/:id/approve` | 리뷰 승인 (병원 소유자) | 필요 |
| POST | `/api/reviews/:id/reply` | 리뷰 답변 (병원 소유자) | 필요 |

### 예약 (Reservations)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/reservations` | 내 예약 목록 | 필요 |
| GET | `/api/reservations/:id` | 예약 상세 조회 | 필요 |
| POST | `/api/reservations` | 예약 생성 | 필요 |
| PATCH | `/api/reservations/:id/cancel` | 예약 취소 | 필요 |
| PATCH | `/api/reservations/:id/status` | 예약 상태 변경 (병원 소유자) | 필요 |

## 테스트

```bash
cd backend
npm test
```

## 모바일 앱 실행

```bash
cd mobile
npm install
npx expo start
```

Expo Go 앱으로 QR 코드를 스캔하여 실행합니다.

## 대시보드 실행

```bash
cd dashboard
npm install
npm start
```

## 데이터베이스 마이그레이션

`database/migrations/` 폴더에 SQL 파일이 번호 순서대로 들어있습니다.

| 파일 | 설명 |
|------|------|
| `001_create_users.sql` | 사용자 테이블 |
| `002_create_hospitals.sql` | 병원 테이블 |
| `003_create_reviews.sql` | 리뷰 테이블 |
| `004_create_reservations.sql` | 예약 테이블 |
| `005_create_subscriptions.sql` | 구독 테이블 |
| `006_seed_data.sql` | 초기 시드 데이터 |
| `007_add_auth_columns.sql` | 인증 관련 컬럼 추가 |
| `008_create_review_helpfuls.sql` | 리뷰 도움 테이블 |
| `009_add_review_reply_columns.sql` | 리뷰 답변 컬럼 추가 |

Docker Compose 사용 시 첫 실행에 자동으로 마이그레이션이 실행됩니다.
로컬 환경에서는 `psql` 명령으로 수동 실행합니다.

## API 응답 형식

모든 API 응답은 다음 형태로 통일되어 있습니다:

```json
{
  "success": true,
  "data": { ... },
  "message": "성공 메시지"
}
```

에러 응답:

```json
{
  "success": false,
  "data": null,
  "message": "에러 메시지"
}
```
