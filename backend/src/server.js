/**
 * 서버 시작 파일
 * 데이터베이스 연결 후 Express + Socket.io 서버를 실행한다.
 */
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const app = require('./app');
const env = require('./config/env');
const { pool, connectDB } = require('./config/database');
const { setupChatHandlers, initRedis } = require('./socket/chat');
const { generateMonthlyReport } = require('./services/aiAnalysis');

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

    // 매월 1일 오전 3시에 전체 병원 월간 리포트 자동 생성
    cron.schedule('0 3 1 * *', async () => {
      console.log('[CRON] 월간 리포트 자동 생성 시작');
      try {
        const now = new Date();
        // 이전 달 계산
        const target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = target.getFullYear();
        const month = target.getMonth() + 1;

        // 활성 병원 목록 조회
        const { rows: hospitals } = await pool.query(
          'SELECT hospital_id FROM hospitals WHERE is_active = true'
        );

        let success = 0;
        for (const h of hospitals) {
          try {
            await generateMonthlyReport(h.hospital_id, year, month);
            success++;
          } catch (err) {
            console.error(`[CRON] 병원 ${h.hospital_id} 리포트 생성 실패:`, err.message);
          }
        }
        console.log(`[CRON] 월간 리포트 완료: ${success}/${hospitals.length}건`);
      } catch (error) {
        console.error('[CRON] 월간 리포트 스케줄러 실패:', error.message);
      }
    });

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
