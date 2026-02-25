/**
 * 환율 변환 훅
 * KRW 금액을 선택된 언어에 맞는 통화로 변환
 * 실시간 환율 API (무료) 연동 + 캐시
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { LanguageCode } from '../i18n';

// 언어별 기본 통화 매핑
const LANG_CURRENCY_MAP: Record<LanguageCode, string> = {
  en: 'USD',
  ja: 'JPY',
  zh: 'CNY',
};

// 통화 기호
const CURRENCY_SYMBOLS: Record<string, string> = {
  KRW: '\u20A9',
  USD: '$',
  JPY: '\u00A5',
  CNY: '\u00A5',
};

// 기본 환율 (오프라인 폴백)
const DEFAULT_RATES: Record<string, number> = {
  USD: 0.00075,  // 1 KRW = 0.00075 USD (약 1,330원/달러)
  JPY: 0.112,    // 1 KRW = 0.112 JPY (약 8.9원/엔)
  CNY: 0.0054,   // 1 KRW = 0.0054 CNY (약 185원/위안)
};

const CACHE_KEY = 'exchangeRates';
const CACHE_DURATION = 60 * 60 * 1000; // 1시간

interface ExchangeRates {
  rates: Record<string, number>;
  timestamp: number;
}

export function useCurrency() {
  const { language } = useLanguage();
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);

  const currency = LANG_CURRENCY_MAP[language];
  const symbol = CURRENCY_SYMBOLS[currency];

  // 환율 불러오기 (캐시 → API → 기본값)
  useEffect(() => {
    (async () => {
      try {
        // 캐시 확인
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: ExchangeRates = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_DURATION) {
            setRates(parsed.rates);
            setLoading(false);
            return;
          }
        }

        // API 호출 (무료 공개 API)
        const response = await fetch(
          'https://open.er-api.com/v6/latest/KRW'
        );
        if (response.ok) {
          const data = await response.json();
          const newRates: Record<string, number> = {
            USD: data.rates?.USD || DEFAULT_RATES.USD,
            JPY: data.rates?.JPY || DEFAULT_RATES.JPY,
            CNY: data.rates?.CNY || DEFAULT_RATES.CNY,
          };
          setRates(newRates);

          // 캐시 저장
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
            rates: newRates,
            timestamp: Date.now(),
          }));
        }
      } catch {
        // 기본 환율 사용
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * KRW 금액을 선택 통화로 변환 (포맷 포함)
   * @param krw - 원화 금액
   * @param showKrw - KRW도 함께 표시 여부 (기본: false)
   */
  const convert = useCallback((krw: number, showKrw = false): string => {
    const rate = rates[currency] || DEFAULT_RATES[currency];
    const converted = Math.round(krw * rate);

    // 통화별 포맷
    let formatted: string;
    if (currency === 'JPY') {
      formatted = `${symbol}${converted.toLocaleString()}`;
    } else if (currency === 'CNY') {
      formatted = `${symbol}${converted.toLocaleString()}`;
    } else {
      formatted = `${symbol}${converted.toLocaleString()}`;
    }

    if (showKrw) {
      return `${formatted} (\u20A9${krw.toLocaleString()})`;
    }
    return formatted;
  }, [rates, currency, symbol]);

  /**
   * 현재 환율 정보 (홈 화면 표시용)
   */
  const getRateDisplay = useCallback((): string => {
    const rate = rates[currency] || DEFAULT_RATES[currency];
    if (currency === 'USD') {
      return `$1 = \u20A9${Math.round(1 / rate).toLocaleString()}`;
    }
    if (currency === 'JPY') {
      return `\u00A5100 = \u20A9${Math.round(100 / rate).toLocaleString()}`;
    }
    // CNY
    return `\u00A51 = \u20A9${Math.round(1 / rate).toLocaleString()}`;
  }, [rates, currency]);

  return {
    currency,
    symbol,
    rates,
    loading,
    convert,
    getRateDisplay,
  };
}
