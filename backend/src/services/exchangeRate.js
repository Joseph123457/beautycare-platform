/**
 * 환율 서비스
 *
 * exchangerate-api.com 무료 API로 KRW 기준 실시간 환율을 조회한다.
 * (무료 플랜: 1,500회/월)
 *
 * Redis 캐시(1시간)를 적용하여 API 호출을 최소화한다.
 * Redis 연결 실패 시 메모리 캐시 → 오프라인 기본값 순으로 폴백.
 *
 * 내보내기:
 *   getRates()                      — 전체 환율 객체 반환
 *   convertKRW(amount, currency)    — KRW → 대상 통화 변환
 */
const env = require('../config/env');

// ─── 상수 ──────────────────────────────────────────────

const SUPPORTED_CURRENCIES = ['USD', 'JPY', 'CNY'];
const REDIS_CACHE_KEY = 'exchange_rates:krw';
const CACHE_TTL = 3600; // 1시간 (초)

// 오프라인 폴백 환율 (API 호출 불가 시)
const DEFAULT_RATES = {
  KRW_USD: 0.00076,  // 약 1,315원/달러
  KRW_JPY: 0.112,    // 약 8.9원/엔
  KRW_CNY: 0.0054,   // 약 185원/위안
};

// 메모리 캐시 (Redis 실패 시 폴백)
let memoryCache = null;

// ─── Redis 클라이언트 ──────────────────────────────────

let redisClient = null;

/**
 * Redis 클라이언트 지연 초기화
 * 첫 요청 시 한 번만 연결한다. 연결 실패 시 캐시 없이 동작.
 */
const getRedis = async () => {
  if (redisClient) return redisClient;
  try {
    const { createClient } = require('redis');
    redisClient = createClient({
      socket: { host: env.redis.host, port: env.redis.port },
      password: env.redis.password || undefined,
    });
    redisClient.on('error', (err) => {
      console.error('[EXCHANGE] Redis 에러:', err.message);
    });
    await redisClient.connect();
    return redisClient;
  } catch {
    console.warn('[EXCHANGE] Redis 연결 실패 — 메모리 캐시로 동작합니다');
    return null;
  }
};

/**
 * Redis에서 캐시된 환율 조회
 * @returns {object|null}
 */
const getCachedRates = async () => {
  try {
    const redis = await getRedis();
    if (!redis) return null;
    const cached = await redis.get(REDIS_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

/**
 * Redis에 환율 캐시 저장
 * @param {object} data - 환율 데이터
 */
const setCachedRates = async (data) => {
  try {
    const redis = await getRedis();
    if (!redis) return;
    await redis.set(REDIS_CACHE_KEY, JSON.stringify(data), { EX: CACHE_TTL });
  } catch {
    // 캐시 저장 실패는 무시
  }
};

// ─── 환율 API 호출 ─────────────────────────────────────

/**
 * exchangerate-api.com에서 KRW 기준 환율을 가져온다.
 * @returns {object} { KRW_USD, KRW_JPY, KRW_CNY, updated_at }
 */
const fetchRatesFromAPI = async () => {
  const apiKey = env.exchangeRate.apiKey;
  let url;

  if (apiKey) {
    // 유료/키 인증 엔드포인트
    url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/KRW`;
  } else {
    // 무료 공개 엔드포인트 (open.er-api.com)
    url = 'https://open.er-api.com/v6/latest/KRW';
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`환율 API HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.result !== 'success') {
    throw new Error('환율 API 응답 실패');
  }

  return {
    KRW_USD: data.rates.USD,
    KRW_JPY: data.rates.JPY,
    KRW_CNY: data.rates.CNY,
    updated_at: data.time_last_update_utc || new Date().toISOString(),
  };
};

// ─── 공개 함수 ─────────────────────────────────────────

/**
 * 현재 환율 조회
 * 우선순위: Redis 캐시 → API 호출 → 메모리 캐시 → 기본값
 * @returns {Promise<{ KRW_USD: number, KRW_JPY: number, KRW_CNY: number, updated_at: string }>}
 */
const getRates = async () => {
  // 1) Redis 캐시 확인
  const cached = await getCachedRates();
  if (cached) {
    memoryCache = cached; // 메모리 캐시도 갱신
    return cached;
  }

  // 2) API 호출
  try {
    const rates = await fetchRatesFromAPI();

    // Redis + 메모리 캐시 저장
    await setCachedRates(rates);
    memoryCache = rates;

    console.log('[EXCHANGE] 환율 갱신 완료:', JSON.stringify(rates));
    return rates;
  } catch (err) {
    console.error('[EXCHANGE] 환율 API 호출 실패:', err.message);
  }

  // 3) 메모리 캐시 폴백
  if (memoryCache) {
    console.warn('[EXCHANGE] 메모리 캐시 사용');
    return memoryCache;
  }

  // 4) 오프라인 기본값
  console.warn('[EXCHANGE] 기본 환율 사용');
  return {
    ...DEFAULT_RATES,
    updated_at: new Date().toISOString(),
  };
};

/**
 * KRW 금액을 대상 통화로 변환
 * @param {number} amount - KRW 금액
 * @param {string} targetCurrency - 대상 통화 (USD/JPY/CNY)
 * @returns {Promise<number>} 변환된 금액
 * @throws {Error} 지원하지 않는 통화인 경우
 */
const convertKRW = async (amount, targetCurrency) => {
  const currency = targetCurrency.toUpperCase();

  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error(`지원하지 않는 통화입니다: ${currency} (지원: ${SUPPORTED_CURRENCIES.join(', ')})`);
  }

  const rates = await getRates();
  const rateKey = `KRW_${currency}`;
  const rate = rates[rateKey];

  const converted = amount * rate;

  // 통화별 소수점 처리
  if (currency === 'JPY') {
    return Math.round(converted); // JPY는 정수
  }
  // USD, CNY는 소수점 2자리
  return Math.round(converted * 100) / 100;
};

module.exports = {
  getRates,
  convertKRW,
  SUPPORTED_CURRENCIES,
};
