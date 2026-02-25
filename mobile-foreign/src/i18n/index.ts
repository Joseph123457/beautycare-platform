/**
 * i18n 설정
 * react-i18next + 기기 언어 자동 감지 + AsyncStorage 언어 저장
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

// 지원 언어 목록
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'ja', label: '\u65E5\u672C\u8A9E', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'zh', label: '\u4E2D\u6587', flag: '\u{1F1E8}\u{1F1F3}' },
] as const;

export type LanguageCode = 'en' | 'ja' | 'zh';

// AsyncStorage 키
const LANGUAGE_KEY = 'appLanguage';

/**
 * 저장된 언어 코드 불러오기
 * 없으면 기기 언어 감지 → 지원 언어면 사용, 아니면 en
 */
export const getSavedLanguage = async (): Promise<LanguageCode> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved && ['en', 'ja', 'zh'].includes(saved)) {
      return saved as LanguageCode;
    }
  } catch {
    // 무시
  }

  // 기기 언어 감지
  const locales = Localize.getLocales();
  if (locales.length > 0) {
    const deviceLang = locales[0].languageCode;
    if (deviceLang === 'ja') return 'ja';
    if (deviceLang === 'zh') return 'zh';
  }

  return 'en';
};

/**
 * 언어 저장 + i18n 전환
 */
export const setLanguage = async (lang: LanguageCode) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
};

// i18next 초기화
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
    zh: { translation: zh },
  },
  lng: 'en', // 기본값 (앱 시작 시 getSavedLanguage로 덮어씀)
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
