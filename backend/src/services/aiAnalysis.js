/**
 * AI 리뷰 분석 서비스
 *
 * Anthropic Claude API를 사용하여 리뷰를 자동 분석한다.
 *   1) analyzeReviewSentiment — 개별 리뷰 감성 분석
 *   2) generateMonthlyReport  — 병원별 월간 리포트 생성
 *   3) getKeywordTrend         — 키워드 트렌드 조회
 */
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../config/database');

// Anthropic 클라이언트 (ANTHROPIC_API_KEY 환경변수 자동 사용)
const client = new Anthropic();

// ─── 1. 개별 리뷰 감성 분석 ─────────────────────────────

/**
 * 리뷰 텍스트를 Claude API로 분석하여 감성·키워드·요약을 반환한다.
 * 실패 시 1회 재시도, 2번째 실패 시 null 반환.
 *
 * @param {string} reviewContent - 리뷰 본문
 * @param {number} rating - 평점 (1~5)
 * @returns {Promise<Object|null>} { sentiment, score, keywords, summary }
 */
const analyzeReviewSentiment = async (reviewContent, rating) => {
  const prompt = `다음은 성형·미용 병원에 대한 환자 리뷰입니다.
평점: ${rating}/5
리뷰 내용: "${reviewContent}"

아래 JSON 형식으로만 응답해주세요. 다른 텍스트 없이 JSON만 출력하세요.
{
  "sentiment": "positive 또는 negative 또는 neutral 중 하나",
  "score": 0~100 사이 정수 (긍정도 점수),
  "keywords": ["핵심 키워드 최대 5개"],
  "summary": "리뷰 요약 한 문장 (30자 이내)"
}`;

  // 최대 2회 시도 (1회 재시도)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].text.trim();
      // JSON 블록 추출 (```json ... ``` 래핑 대비)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON 파싱 실패: 응답에 JSON 객체 없음');

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        sentiment: parsed.sentiment,
        score: Number(parsed.score),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        summary: parsed.summary,
      };
    } catch (error) {
      if (attempt === 1) {
        console.error('AI 감성 분석 최종 실패:', error.message);
        return null;
      }
      console.warn(`AI 감성 분석 ${attempt + 1}차 시도 실패, 재시도...`, error.message);
    }
  }
  return null;
};

// ─── 2. 월간 리포트 생성 ────────────────────────────────

/**
 * 특정 병원의 월간 리뷰 분석 리포트를 생성하고 DB에 저장한다.
 *
 * @param {number} hospitalId - 병원 ID
 * @param {number} year - 연도
 * @param {number} month - 월 (1~12)
 * @returns {Promise<Object>} 저장된 리포트 데이터
 */
const generateMonthlyReport = async (hospitalId, year, month) => {
  // 해당 월의 승인된 리뷰 조회
  const { rows: reviews } = await pool.query(
    `SELECT content, rating, ai_analysis
     FROM reviews
     WHERE hospital_id = $1
       AND is_approved = true
       AND EXTRACT(YEAR FROM created_at) = $2
       AND EXTRACT(MONTH FROM created_at) = $3
     ORDER BY created_at`,
    [hospitalId, year, month]
  );

  if (reviews.length === 0) {
    return {
      hospital_id: hospitalId,
      year,
      month,
      report_data: { message: '해당 월에 승인된 리뷰가 없습니다' },
      review_count: 0,
    };
  }

  // 리뷰 텍스트를 Claude에 일괄 전달
  const reviewTexts = reviews
    .map((r, i) => `[리뷰 ${i + 1}] 평점: ${r.rating}/5\n${r.content}`)
    .join('\n\n');

  const prompt = `다음은 성형·미용 병원의 ${year}년 ${month}월 환자 리뷰 ${reviews.length}건입니다.

${reviewTexts}

아래 JSON 형식으로만 응답해주세요. 다른 텍스트 없이 JSON만 출력하세요.
{
  "strengths": ["강점 3가지"],
  "improvements": ["개선점 3가지"],
  "competitive_edge": "경쟁 우위 요약 (한 문장)",
  "advice": "병원에 대한 한 줄 조언",
  "average_sentiment_score": 0~100 사이 정수,
  "top_keywords": ["가장 많이 언급된 키워드 5개"]
}`;

  // 최대 2회 시도
  let reportData;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON 파싱 실패');

      reportData = JSON.parse(jsonMatch[0]);
      break;
    } catch (error) {
      if (attempt === 1) {
        console.error('월간 리포트 생성 최종 실패:', error.message);
        throw error;
      }
      console.warn(`월간 리포트 생성 ${attempt + 1}차 시도 실패, 재시도...`);
    }
  }

  // DB에 UPSERT 저장
  const { rows } = await pool.query(
    `INSERT INTO monthly_reports (hospital_id, year, month, report_data, review_count)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (hospital_id, year, month)
     DO UPDATE SET report_data = $4, review_count = $5, created_at = NOW()
     RETURNING *`,
    [hospitalId, year, month, JSON.stringify(reportData), reviews.length]
  );

  return rows[0];
};

// ─── 3. 키워드 트렌드 조회 ──────────────────────────────

/**
 * 최근 3개월간 승인된 리뷰의 AI 분석 키워드를 집계하여 Top 10 반환.
 * DB에 저장된 ai_analysis JSONB에서 직접 집계한다 (Claude API 호출 없음).
 *
 * @param {number} hospitalId - 병원 ID
 * @returns {Promise<Array>} [{ keyword, count, sentiment_breakdown }]
 */
const getKeywordTrend = async (hospitalId) => {
  // 최근 3개월 승인 리뷰의 ai_analysis 조회
  const { rows } = await pool.query(
    `SELECT ai_analysis
     FROM reviews
     WHERE hospital_id = $1
       AND is_approved = true
       AND ai_analysis IS NOT NULL
       AND created_at >= NOW() - INTERVAL '3 months'
     ORDER BY created_at DESC`,
    [hospitalId]
  );

  // 키워드별 카운트 및 감성 집계
  const keywordMap = {};

  for (const row of rows) {
    const analysis = row.ai_analysis;
    if (!analysis || !Array.isArray(analysis.keywords)) continue;

    const sentiment = analysis.sentiment || 'neutral';

    for (const keyword of analysis.keywords) {
      if (!keywordMap[keyword]) {
        keywordMap[keyword] = { count: 0, positive: 0, negative: 0, neutral: 0 };
      }
      keywordMap[keyword].count += 1;
      keywordMap[keyword][sentiment] = (keywordMap[keyword][sentiment] || 0) + 1;
    }
  }

  // Top 10 정렬
  const sorted = Object.entries(keywordMap)
    .map(([keyword, data]) => ({
      keyword,
      count: data.count,
      sentiment_breakdown: {
        positive: data.positive,
        negative: data.negative,
        neutral: data.neutral,
      },
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return sorted;
};

module.exports = {
  analyzeReviewSentiment,
  generateMonthlyReport,
  getKeywordTrend,
};
