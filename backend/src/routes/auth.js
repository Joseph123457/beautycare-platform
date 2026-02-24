/**
 * 인증 라우트
 *
 * 공개 엔드포인트:
 *   POST /signup   — 일반 회원가입
 *   POST /login    — 이메일/비밀번호 로그인
 *   POST /kakao    — 카카오 소셜 로그인
 *   POST /refresh  — 액세스 토큰 갱신
 *
 * 인증 필요 엔드포인트:
 *   POST /logout   — 로그아웃
 */
const express = require('express');
const { body } = require('express-validator');
const { signup, login, kakaoLogin, refresh, logout } = require('../controllers/auth');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = express.Router();

// ─── 회원가입 유효성 검사 ─────────────────────────────
const signupValidation = [
  body('email')
    .isEmail().withMessage('유효한 이메일을 입력해주세요'),
  body('password')
    .isLength({ min: 6 }).withMessage('비밀번호는 최소 6자 이상이어야 합니다'),
  body('name')
    .notEmpty().withMessage('이름을 입력해주세요'),
  body('phone')
    .notEmpty().withMessage('전화번호를 입력해주세요'),
];

// ─── 로그인 유효성 검사 ───────────────────────────────
const loginValidation = [
  body('email')
    .isEmail().withMessage('유효한 이메일을 입력해주세요'),
  body('password')
    .notEmpty().withMessage('비밀번호를 입력해주세요'),
];

// ─── 카카오 로그인 유효성 검사 ────────────────────────
const kakaoValidation = [
  body('kakaoAccessToken')
    .notEmpty().withMessage('카카오 액세스 토큰이 필요합니다'),
];

// ─── 토큰 갱신 유효성 검사 ────────────────────────────
const refreshValidation = [
  body('refreshToken')
    .notEmpty().withMessage('리프레시 토큰이 필요합니다'),
];

// ─── 공개 라우트 ──────────────────────────────────────

// POST /api/auth/signup — 회원가입
router.post('/signup', signupValidation, validate, signup);

// POST /api/auth/login — 로그인
router.post('/login', loginValidation, validate, login);

// POST /api/auth/kakao — 카카오 소셜 로그인
router.post('/kakao', kakaoValidation, validate, kakaoLogin);

// POST /api/auth/refresh — 토큰 갱신
router.post('/refresh', refreshValidation, validate, refresh);

// ─── 인증 필요 라우트 ─────────────────────────────────

// POST /api/auth/logout — 로그아웃
router.post('/logout', authMiddleware, logout);

module.exports = router;
