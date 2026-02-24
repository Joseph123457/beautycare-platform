/**
 * 데이터베이스 설정
 * PostgreSQL 연결 풀을 생성하고 연결 테스트 함수를 제공한다.
 */
const { Pool } = require('pg');
const env = require('./env');

// PostgreSQL 연결 풀 생성
// 테스트 환경에서는 TEST_DATABASE_URL 환경변수로 별도 DB 사용
const poolConfig = (process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL)
  ? { connectionString: process.env.TEST_DATABASE_URL }
  : {
      host: env.db.host,
      port: env.db.port,
      database: env.db.name,
      user: env.db.user,
      password: env.db.password,
    };

const pool = new Pool(poolConfig);

/**
 * 데이터베이스 연결 테스트
 * 서버 시작 시 호출하여 DB 연결 상태를 확인한다.
 */
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL 데이터베이스 연결 성공');
    client.release();
  } catch (error) {
    console.error('데이터베이스 연결 실패:', error.message);
    throw error;
  }
};

module.exports = { pool, connectDB };
