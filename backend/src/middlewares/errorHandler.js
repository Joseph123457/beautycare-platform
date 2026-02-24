/**
 * 글로벌 에러 핸들러
 * 모든 라우트에서 발생하는 예외를 잡아 통일된 에러 응답을 반환한다.
 */
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error('에러 발생:', err.message);

  // 개발 환경에서는 스택 트레이스 출력
  if (env.nodeEnv === 'development') {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || '서버 내부 오류가 발생했습니다';

  res.status(statusCode).json({
    success: false,
    data: null,
    message,
  });
};

module.exports = errorHandler;
