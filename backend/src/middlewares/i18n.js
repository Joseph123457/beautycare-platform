/**
 * i18n 미들웨어
 *
 * Accept-Language 헤더에서 클라이언트 언어를 감지하여
 * req.language, req.t()를 주입한다.
 *
 * 우선순위:
 *   1) Accept-Language 헤더 (예: "ja", "en-US,en;q=0.9")
 *   2) ?lang 쿼리 파라미터 (예: /api/hospitals?lang=zh)
 *   3) 기본값: ko
 *
 * 사용법:
 *   req.t('common:reservation.confirmed')
 *   req.t('errors:auth.tokenRequired')
 *   req.t('notifications:push.reservation.confirmedBody', { hospital: '서울병원', treatment: '눈성형' })
 */
const { i18next, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } = require('../config/i18n');

/**
 * Accept-Language 헤더에서 지원 언어 추출
 * "en-US,en;q=0.9,ja;q=0.8" → 'en'
 * "zh-CN" → 'zh'
 * @param {string} header - Accept-Language 헤더 값
 * @returns {string|null} 지원하는 언어 코드 또는 null
 */
const parseAcceptLanguage = (header) => {
  if (!header) return null;

  // 쉼표로 분리하고 q 값 기준으로 정렬
  const languages = header
    .split(',')
    .map((part) => {
      const [lang, quality] = part.trim().split(';q=');
      return {
        code: lang.trim().split('-')[0].toLowerCase(), // "en-US" → "en"
        q: quality ? parseFloat(quality) : 1.0,
      };
    })
    .sort((a, b) => b.q - a.q);

  // 지원 언어 중 첫 번째 매칭 반환
  for (const { code } of languages) {
    if (SUPPORTED_LANGUAGES.includes(code)) {
      return code;
    }
  }

  return null;
};

/**
 * i18n 미들웨어
 * req.language: 감지된 언어 코드 (ko|en|ja|zh)
 * req.t(key, options): 번역 함수
 */
const i18nMiddleware = (req, res, next) => {
  // 1) 쿼리 파라미터 우선
  const queryLang = req.query.lang;
  // 2) Accept-Language 헤더
  const headerLang = parseAcceptLanguage(req.headers['accept-language']);

  // 지원 언어 중 하나인지 검증
  let language = DEFAULT_LANGUAGE;

  if (queryLang && SUPPORTED_LANGUAGES.includes(queryLang)) {
    language = queryLang;
  } else if (headerLang) {
    language = headerLang;
  }

  // req에 언어 정보 주입
  req.language = language;

  // 고정 언어의 t 함수 생성 (네임스페이스 변경 가능)
  req.t = (key, options = {}) => {
    return i18next.t(key, { lng: language, ...options });
  };

  next();
};

module.exports = i18nMiddleware;
