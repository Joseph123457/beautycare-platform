/**
 * 테스트 환경변수 설정
 * Jest setupFiles에서 모듈 로딩 전 실행되어 NODE_ENV를 'test'로 설정한다.
 * database.js가 로딩될 때 TEST_DATABASE_URL을 사용하도록 보장한다.
 */
process.env.NODE_ENV = 'test';
