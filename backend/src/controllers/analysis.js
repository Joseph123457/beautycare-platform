/**
 * AI 분석 컨트롤러
 *
 * 엔드포인트:
 *   POST /api/analysis/monthly-report — 월간 리포트 생성/조회
 *   GET  /api/analysis/keywords/:hospital_id — 키워드 트렌드 조회
 */
const { pool } = require('../config/database');
const { generateMonthlyReport, getKeywordTrend } = require('../services/aiAnalysis');
const { successResponse, errorResponse } = require('../utils/response');

// ─── 1. 월간 리포트 생성/조회 ────────────────────────────

/**
 * POST /api/analysis/monthly-report
 *
 * body: { year?, month? } — 미입력 시 이전 달
 * requireBasic 미들웨어가 req.hospital을 주입한다.
 */
const generateReport = async (req, res, next) => {
  try {
    const hospitalId = req.hospital.hospital_id;

    // year/month 기본값: 이전 달
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = parseInt(req.body.year, 10) || prevMonth.getFullYear();
    const month = parseInt(req.body.month, 10) || (prevMonth.getMonth() + 1);

    // 유효성 검사
    if (month < 1 || month > 12) {
      return errorResponse(res, '월은 1~12 사이여야 합니다', 400);
    }

    // 이미 생성된 리포트 확인 (중복 방지)
    const { rows: existing } = await pool.query(
      `SELECT * FROM monthly_reports
       WHERE hospital_id = $1 AND year = $2 AND month = $3`,
      [hospitalId, year, month]
    );

    if (existing.length > 0) {
      return successResponse(res, existing[0], '기존 월간 리포트를 반환합니다');
    }

    // 새 리포트 생성
    const report = await generateMonthlyReport(hospitalId, year, month);
    return successResponse(res, report, `${year}년 ${month}월 리포트가 생성되었습니다`, 201);
  } catch (error) {
    next(error);
  }
};

// ─── 2. 키워드 트렌드 조회 ──────────────────────────────

/**
 * GET /api/analysis/keywords/:hospital_id
 *
 * 최근 3개월 키워드 Top 10 반환
 */
const getKeywords = async (req, res, next) => {
  try {
    const hospitalId = req.params.hospital_id;

    const keywords = await getKeywordTrend(hospitalId);
    return successResponse(res, { hospital_id: Number(hospitalId), keywords }, '키워드 트렌드 조회 성공');
  } catch (error) {
    next(error);
  }
};

module.exports = { generateReport, getKeywords };
