/**
 * Express 앱 설정
 * 미들웨어 등록, 라우트 마운트, 에러 핸들러 연결을 담당한다.
 */
const express = require('express');
const path = require('path');
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
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');
const patientRoutes = require('./routes/patients');
const stripePaymentRoutes = require('./routes/stripePayments');
const exchangeRateRoutes = require('./routes/exchangeRates');
const interpreterRoutes = require('./routes/interpreters');
const guideRoutes = require('./routes/guide');
const feedRoutes = require('./routes/feed');
const favoritesRoutes = require('./routes/favorites');
const adminRoutes = require('./routes/admin');

// 다국어 미들웨어
const i18nMiddleware = require('./middlewares/i18n');

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

// Stripe 웹훅 (raw body 필요 — JSON 파서 전에 마운트)
app.use('/api/payments/stripe/confirm', express.raw({ type: 'application/json' }), stripePaymentRoutes.webhookRouter);

// JSON 요청 본문 파싱
app.use(express.json());

// URL-encoded 요청 본문 파싱
app.use(express.urlencoded({ extended: true }));

// 업로드 파일 정적 서빙
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 다국어 처리 (Accept-Language 감지 → req.language, req.t 주입)
app.use(i18nMiddleware);

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: null, message: req.t('common:common.serverHealthy') });
});

// API 라우트 마운트
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/payments/stripe', stripePaymentRoutes);
app.use('/api/exchange-rates', exchangeRateRoutes);
app.use('/api/interpreters', interpreterRoutes);
app.use('/api/admin/interpreters', interpreterRoutes.adminRouter);
app.use('/api/guide', guideRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/admin', adminRoutes);

// 404 처리
app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    message: req.t('errors:common.notFound'),
  });
});

// 글로벌 에러 핸들러
app.use(errorHandler);

module.exports = app;
