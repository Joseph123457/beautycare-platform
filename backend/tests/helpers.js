/**
 * 테스트 헬퍼 함수
 * supertest 기반 API 요청 유틸리티
 */
const request = require('supertest');
const app = require('../src/app');

const api = request(app);

// ─── 공개 API 요청 ──────────────────────────────────────

/** 회원가입 */
const signup = (data) => api.post('/api/auth/signup').send(data);

/** 로그인 */
const login = (email, password) =>
  api.post('/api/auth/login').send({ email, password });

// ─── 인증된 API 요청 ────────────────────────────────────

/** 인증 헤더가 포함된 GET 요청 */
const authGet = (url, token) =>
  api.get(url).set('Authorization', `Bearer ${token}`);

/** 인증 헤더가 포함된 POST 요청 */
const authPost = (url, token, data) =>
  api.post(url).set('Authorization', `Bearer ${token}`).send(data);

/** 인증 헤더가 포함된 PATCH 요청 */
const authPatch = (url, token, data) =>
  api.patch(url).set('Authorization', `Bearer ${token}`).send(data);

module.exports = { api, signup, login, authGet, authPost, authPatch };
