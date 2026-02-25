/**
 * 환율 라우트
 * 외국인 앱에서 사용할 실시간 환율 조회 엔드포인트
 */
const express = require('express');
const { getRates } = require('../services/exchangeRate');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

/**
 * GET /api/exchange-rates
 * 현재 KRW 기준 환율 조회 (인증 불필요)
 *
 * 응답:
 *   { KRW_USD, KRW_JPY, KRW_CNY, updated_at }
 */
router.get('/', async (req, res, next) => {
  try {
    const rates = await getRates();
    return successResponse(res, rates, '환율 조회 성공');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
