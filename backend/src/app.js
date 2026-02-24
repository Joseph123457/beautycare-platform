/**
 * Express 앱 설정
 * 미들웨어 등록, 라우트 마운트, 에러 핸들러 연결을 담당한다.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// 라우트 임포트
const authRoutes = require('./routes/auth');
const hospitalRoutes = require('./routes/hospitals');
const reviewRoutes = require('./routes/reviews');
const reservationRoutes = require('./routes/reservations');
const subscriptionRoutes = require('./routes/subscriptions');
const chatRoutes = require('./routes/chats');
const analysisRoutes = require('./routes/analysis');

// 에러 핸들러 임포트
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// 보안 헤더 설정
app.use(helmet());

// CORS 설정 (개발 환경: 모든 출처 허용)
app.use(cors());

// 요청 로그 출력 (테스트 환경에서는 비활성화)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// JSON 요청 본문 파싱
app.use(express.json());

// URL-encoded 요청 본문 파싱
app.use(express.urlencoded({ extended: true }));

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: null, message: '서버가 정상 작동 중입니다' });
});

// API 라우트 마운트
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/analysis', analysisRoutes);

// 404 처리
app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    message: '요청한 리소스를 찾을 수 없습니다',
  });
});

// 글로벌 에러 핸들러
app.use(errorHandler);

module.exports = app;
