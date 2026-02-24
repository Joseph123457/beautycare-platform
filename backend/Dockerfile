# ── 빌드 스테이지: 의존성 설치 ──
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ── 실행 스테이지: 최소 이미지 ──
FROM node:18-alpine
WORKDIR /app

# 보안: non-root 사용자로 실행
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 빌드 스테이지에서 의존성 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# 소스 코드 복사
COPY src/ ./src/

# non-root 사용자로 전환
USER appuser

EXPOSE 3000

CMD ["node", "src/server.js"]
