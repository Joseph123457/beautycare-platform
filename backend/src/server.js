/**
 * 서버 시작 파일
 * 데이터베이스 연결 후 Express + Socket.io 서버를 실행한다.
 */
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/database');
const { setupChatHandlers, initRedis } = require('./socket/chat');

const start = async () => {
  try {
    // 데이터베이스 연결
    await connectDB();

    // Redis 초기화 (채팅 온라인 상태 관리)
    await initRedis();

    // HTTP 서버 생성 (Express + Socket.io 공유)
    const server = http.createServer(app);

    // Socket.io 서버 설정
    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // 채팅 이벤트 핸들러 등록
    setupChatHandlers(io);

    // app에 io 인스턴스 저장 (REST API에서 소켓 이벤트 발생 시 사용)
    app.set('io', io);

    // 서버 시작
    server.listen(env.port, () => {
      console.log(`서버가 포트 ${env.port}에서 실행 중입니다 (${env.nodeEnv})`);
      console.log(`Socket.io 채팅 서버 준비 완료`);
    });
  } catch (error) {
    console.error('서버 시작 실패:', error.message);
    process.exit(1);
  }
};

start();
