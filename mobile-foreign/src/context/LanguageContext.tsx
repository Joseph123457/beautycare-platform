/**
 * 언어 컨텍스트
 * 앱 전역 언어 상태 관리 + 온보딩 완료 여부 추적
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSavedLanguage, setLanguage as setI18nLanguage, LanguageCode } from '../i18n';

interface LanguageContextType {
  language: LanguageCode;
  onboardingDone: boolean;
  loading: boolean;
  changeLanguage: (lang: LanguageCode) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  onboardingDone: false,
  loading: true,
  changeLanguage: async () => {},
  completeOnboarding: async () => {},
});

const ONBOARDING_KEY = 'languageOnboardingDone';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 저장된 언어 + 온보딩 상태 복원
  useEffect(() => {
    (async () => {
      try {
        const savedLang = await getSavedLanguage();
        await setI18nLanguage(savedLang);
        setLanguage(savedLang);

        const done = await AsyncStorage.getItem(ONBOARDING_KEY);
        setOnboardingDone(done === 'true');
      } catch {
        // 기본값 유지
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 언어 변경
  const changeLanguage = useCallback(async (lang: LanguageCode) => {
    await setI18nLanguage(lang);
    setLanguage(lang);
  }, []);

  // 온보딩 완료 처리
  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingDone(true);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, onboardingDone, loading, changeLanguage, completeOnboarding }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
