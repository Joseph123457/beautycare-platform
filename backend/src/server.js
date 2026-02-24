/**
 * 서버 시작 파일
 * 데이터베이스 연결 후 Express 서버를 실행한다.
 */
const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/database');

const start = async () => {
  try {
    // 데이터베이스 연결
    await connectDB();

    // 서버 시작
    app.listen(env.port, () => {
      console.log(`서버가 포트 ${env.port}에서 실행 중입니다 (${env.nodeEnv})`);
    });
  } catch (error) {
    console.error('서버 시작 실패:', error.message);
    process.exit(1);
  }
};

start();
