/**
 * Jest 설정
 * API 통합 테스트용 설정
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/setup-env.js'],
  testTimeout: 15000,
};
