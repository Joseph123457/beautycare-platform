/**
 * 환경변수 설정
 * dotenv를 로드하고 환경변수를 모듈로 내보낸다.
 */
const dotenv = require('dotenv');
const path = require('path');

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  // 서버 설정
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // 데이터베이스 설정
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'beautycare',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  // JWT 설정
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // 카카오 소셜 로그인
  kakao: {
    appKey: process.env.KAKAO_APP_KEY || '',
  },

  // 토스페이먼츠
  toss: {
    secretKey: process.env.TOSS_SECRET_KEY || '',
    clientKey: process.env.TOSS_CLIENT_KEY || '',
  },

  // Anthropic Claude API
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },

  // Redis 캐시
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },
};
