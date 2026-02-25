/**
 * DeepL 번역 서비스
 *
 * 한국어 텍스트를 영어/일본어/중국어로 자동 번역한다.
 * 번역 결과는 DB에 저장하여 반복 호출을 방지한다.
 *
 * 환경변수: DEEPL_API_KEY
 */
const env = require('../config/env');

// DeepL API 엔드포인트
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

// DeepL 언어 코드 매핑 (우리 코드 → DeepL 코드)
const LANG_MAP = {
  en: 'EN',
  ja: 'JA',
  zh: 'ZH-HANS', // 중국어 간체
};

/**
 * DeepL API로 텍스트 번역
 * @param {string} text - 번역할 한국어 텍스트
 * @param {string} targetLang - 목표 언어 코드 (en|ja|zh)
 * @returns {string|null} 번역된 텍스트 또는 null (실패 시)
 */
const translateText = async (text, targetLang) => {
  if (!text || !text.trim()) return null;
  if (!env.deepl.apiKey) {
    console.warn('[번역] DEEPL_API_KEY가 설정되지 않았습니다');
    return null;
  }

  const deeplLang = LANG_MAP[targetLang];
  if (!deeplLang) {
    console.warn(`[번역] 지원하지 않는 언어: ${targetLang}`);
    return null;
  }

  try {
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${env.deepl.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: 'KO',
        target_lang: deeplLang,
      }),
    });

    if (!response.ok) {
      console.error(`[번역] DeepL API 에러: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.translations?.[0]?.text || null;
  } catch (error) {
    console.error('[번역] DeepL 호출 실패:', error.message);
    return null;
  }
};

/**
 * 여러 필드를 한 번에 번역
 * @param {object} fields - { fieldName: koreanText, ... }
 * @param {string} targetLang - 목표 언어 (en|ja|zh)
 * @returns {object} { fieldName: translatedText, ... }
 */
const translateFields = async (fields, targetLang) => {
  const result = {};
  const entries = Object.entries(fields).filter(([, v]) => v && v.trim());

  // 병렬 번역 요청
  const translations = await Promise.all(
    entries.map(([, text]) => translateText(text, targetLang))
  );

  entries.forEach(([key], idx) => {
    result[key] = translations[idx];
  });

  return result;
};

/**
 * 병원 정보를 모든 지원 언어로 번역
 * @param {object} hospital - { name, description, address }
 * @returns {object} { name_en, name_ja, name_zh, description_en, ... }
 */
const translateHospitalFields = async ({ name, description, address }) => {
  const result = {};
  const targetLangs = ['en', 'ja', 'zh'];

  for (const lang of targetLangs) {
    const fields = {};
    if (name) fields[`name_${lang}`] = name;
    if (description) fields[`description_${lang}`] = description;
    // 주소는 영어만 번역 (일본어/중국어는 한국 주소를 그대로 사용)
    if (address && lang === 'en') fields.address_en = address;

    const translated = await translateFields(
      // 원본 텍스트를 value로, 번역 후 저장할 키를 key로
      Object.fromEntries(Object.keys(fields).map((k) => [k, fields[k]])),
      lang
    );

    Object.assign(result, translated);
  }

  return result;
};

/**
 * 시술 정보를 모든 지원 언어로 번역
 * @param {object} treatment - { name, description }
 * @returns {object} { name_en, name_ja, name_zh, description_en, ... }
 */
const translateTreatmentFields = async ({ name, description }) => {
  const result = {};
  const targetLangs = ['en', 'ja', 'zh'];

  for (const lang of targetLangs) {
    if (name) {
      result[`name_${lang}`] = await translateText(name, lang);
    }
    if (description) {
      result[`description_${lang}`] = await translateText(description, lang);
    }
  }

  return result;
};

module.exports = {
  translateText,
  translateFields,
  translateHospitalFields,
  translateTreatmentFields,
  LANG_MAP,
};
