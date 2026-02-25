/**
 * i18n 초기화 설정
 *
 * i18next + i18next-fs-backend를 사용하여
 * 파일 기반 다국어 번역을 제공한다.
 *
 * 지원 언어: ko(한국어), en(영어), ja(일본어), zh(중국어 간체)
 * 네임스페이스: common(공통), errors(에러), notifications(알림)
 */
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');

// 지원 언어 목록
const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh'];
const DEFAULT_LANGUAGE = 'ko';

// 번역 파일 네임스페이스
const NAMESPACES = ['common', 'errors', 'notifications'];

/**
 * i18next 초기화
 * 서버 시작 시 한 번만 호출한다.
 */
const initI18n = async () => {
  await i18next.use(Backend).init({
    // 기본 언어
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,

    // 지원 언어
    supportedLngs: SUPPORTED_LANGUAGES,

    // 네임스페이스 설정
    ns: NAMESPACES,
    defaultNS: 'common',

    // 파일 기반 백엔드 설정
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
    },

    // 보간 설정 ({{변수}} 치환)
    interpolation: {
      escapeValue: false, // 서버에서는 HTML 이스케이프 불필요
    },

    // 디버그 모드 (개발 환경에서만)
    debug: false,

    // 사전 로드: 모든 언어를 서버 시작 시 로드
    preload: SUPPORTED_LANGUAGES,
  });

  console.log('i18n 초기화 완료 — 지원 언어:', SUPPORTED_LANGUAGES.join(', '));
  return i18next;
};

module.exports = {
  initI18n,
  i18next,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
};
