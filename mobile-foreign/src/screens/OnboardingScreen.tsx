/**
 * 온보딩 화면 (3단계)
 *
 * Step 0: 스플래시 로딩 (1.5초 자동 전환)
 * Step 1: 언어 선택 — 'Welcome to K-Beauty' + 서울 스카이라인 배경
 * Step 2: 여행 일정 입력 — 입국일/출국일 + 관심 시술 다중 선택
 *
 * AsyncStorage 저장: { language, arrivalDate, departureDate, interests }
 * 다음 실행 시 저장된 언어가 있으면 이 화면 스킵
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  TextInput, ScrollView, Platform, Linking, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../i18n';
import { RootStackParamList } from '../types';

type Nav = StackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── 관심 시술 카테고리 ────────────────────────────────

const INTEREST_OPTIONS = [
  { key: 'nose',  icon: '\u{1F443}', labelMap: { en: 'Nose (Rhinoplasty)', ja: '\u9F3B (\u9694\u9F3B\u8853)', zh: '\u9F3B\u5B50 (\u9686\u9F3B)' } },
  { key: 'eyes',  icon: '\u{1F441}\u{FE0F}', labelMap: { en: 'Eyes (Double Eyelid)', ja: '\u76EE (\u4E8C\u91CD\u307E\u3076\u305F)', zh: '\u773C\u775B (\u53CC\u773C\u76AE)' } },
  { key: 'skin',  icon: '\u2728', labelMap: { en: 'Skin (Dermatology)', ja: '\u808C (\u76AE\u819A\u79D1)', zh: '\u76AE\u80A4 (\u76AE\u80A4\u79D1)' } },
  { key: 'teeth', icon: '\u{1F9B7}', labelMap: { en: 'Teeth (Dental)', ja: '\u6B6F (\u6B6F\u79D1)', zh: '\u7259\u9F7F (\u7259\u79D1)' } },
  { key: 'face',  icon: '\u{1F48E}', labelMap: { en: 'Face Contouring', ja: '\u8F2A\u90ED', zh: '\u9762\u90E8\u8F2A\u5ED3' } },
  { key: 'body',  icon: '\u{1F4AA}', labelMap: { en: 'Body Contouring', ja: '\u30DC\u30C7\u30A3', zh: '\u4F53\u96D5' } },
  { key: 'hair',  icon: '\u{1F487}', labelMap: { en: 'Hair Transplant', ja: '\u690D\u6BDB', zh: '\u690D\u53D1' } },
  { key: 'other', icon: '\u2795', labelMap: { en: 'Other', ja: '\u305D\u306E\u4ED6', zh: '\u5176\u4ED6' } },
];

// 여행 일정 저장 키
const TRAVEL_PREFS_KEY = 'travelPreferences';

// ─── 서울 스카이라인 (텍스트 아트) ──────────────────────

function SeoulSkyline() {
  return (
    <View style={styles.skylineContainer}>
      {/* 그라데이션 배경 */}
      <View style={styles.skylineBg}>
        {/* N서울타워 */}
        <View style={styles.tower}>
          <View style={styles.towerTop} />
          <View style={styles.towerBody} />
          <View style={styles.towerBase} />
        </View>
        {/* 빌딩 스카이라인 */}
        <View style={styles.buildings}>
          <View style={[styles.building, { height: 50, width: 18 }]} />
          <View style={[styles.building, { height: 70, width: 14 }]} />
          <View style={[styles.building, { height: 40, width: 22 }]} />
          <View style={[styles.building, { height: 80, width: 16 }]} />
          <View style={[styles.building, { height: 55, width: 20 }]} />
          <View style={[styles.building, { height: 65, width: 12 }]} />
          <View style={[styles.building, { height: 45, width: 24 }]} />
          <View style={[styles.building, { height: 75, width: 15 }]} />
          <View style={[styles.building, { height: 35, width: 18 }]} />
          <View style={[styles.building, { height: 60, width: 20 }]} />
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// 메인 온보딩 컴포넌트
// ═══════════════════════════════════════════════════════

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const { language, changeLanguage, completeOnboarding } = useLanguage();

  // 현재 단계: 0=스플래시, 1=언어선택, 2=여행일정
  const [step, setStep] = useState(0);

  // 언어 선택
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(language);

  // 여행 일정
  const [arrivalDate, setArrivalDate] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  // 애니메이션
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const splashFade = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ─── Step 0: 스플래시 (1.5초) ────────────────────────

  useEffect(() => {
    // 스플래시 페이드인
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 500, useNativeDriver: true,
    }).start();

    // 1.5초 후 스플래시 → 언어 선택
    const timer = setTimeout(() => {
      Animated.timing(splashFade, {
        toValue: 0, duration: 300, useNativeDriver: true,
      }).start(() => {
        setStep(1);
        Animated.timing(slideAnim, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }).start();
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 관심 시술 토글 ──────────────────────────────────

  const toggleInterest = (key: string) => {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // ─── Step 1 → Step 2 전환 ────────────────────────────

  const handleLanguageNext = async () => {
    await changeLanguage(selectedLang);

    // 슬라이드 전환 애니메이션
    Animated.timing(slideAnim, {
      toValue: 0, duration: 200, useNativeDriver: true,
    }).start(() => {
      setStep(2);
      Animated.timing(slideAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();
    });
  };

  // ─── Step 2 완료 → 홈 이동 ───────────────────────────

  const handleComplete = async () => {
    // 여행 선호도 AsyncStorage 저장
    const prefs = {
      language: selectedLang,
      arrivalDate: arrivalDate || null,
      departureDate: departureDate || null,
      interests,
    };
    await AsyncStorage.setItem(TRAVEL_PREFS_KEY, JSON.stringify(prefs));
    await completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  // ─── 라벨 (선택 언어에 따라) ─────────────────────────

  const labels = {
    en: {
      whenVisit: 'When are you visiting Korea?',
      arrival: 'Arrival date',
      departure: 'Departure date',
      dateHint: 'YYYY-MM-DD',
      whatInterest: 'What procedures interest you?',
      selectMultiple: 'Select all that apply',
      done: 'Get Started!',
      skip: 'Skip for now',
      koreanApp: '\uD55C\uAD6D\uC5B4',
    },
    ja: {
      whenVisit: '\u97D3\u56FD\u306B\u3044\u3064\u6765\u307E\u3059\u304B\uFF1F',
      arrival: '\u5165\u56FD\u65E5',
      departure: '\u51FA\u56FD\u65E5',
      dateHint: 'YYYY-MM-DD',
      whatInterest: '\u8208\u5473\u306E\u3042\u308B\u65BD\u8853\u306F\uFF1F',
      selectMultiple: '\u8907\u6570\u9078\u629E\u53EF\u80FD',
      done: '\u59CB\u3081\u307E\u3057\u3087\u3046\uFF01',
      skip: '\u30B9\u30AD\u30C3\u30D7',
      koreanApp: '\uD55C\uAD6D\uC5B4',
    },
    zh: {
      whenVisit: '\u60A8\u4EC0\u4E48\u65F6\u5019\u6765\u97E9\u56FD\uFF1F',
      arrival: '\u5165\u5883\u65E5\u671F',
      departure: '\u51FA\u5883\u65E5\u671F',
      dateHint: 'YYYY-MM-DD',
      whatInterest: '\u60A8\u5BF9\u54EA\u4E9B\u9879\u76EE\u611F\u5174\u8DA3\uFF1F',
      selectMultiple: '\u53EF\u591A\u9009',
      done: '\u5F00\u59CB\u5427\uFF01',
      skip: '\u8DF3\u8FC7',
      koreanApp: '\uD55C\uAD6D\uC5B4',
    },
  };
  const L = labels[selectedLang];

  // ═══════════════════════════════════════════════════════
  // Step 0: 스플래시 화면
  // ═══════════════════════════════════════════════════════

  if (step === 0) {
    return (
      <View style={styles.splashContainer}>
        <Animated.View style={[styles.splashContent, { opacity: fadeAnim }]}>
          <Text style={styles.splashEmoji}>{'\u2728'}</Text>
          <Text style={styles.splashTitle}>BeautyCare Global</Text>
          <Text style={styles.splashSubtitle}>K-Beauty Medical Tourism</Text>

          {/* 로딩 도트 애니메이션 */}
          <View style={styles.loadingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </Animated.View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════
  // Step 1: 언어 선택
  // ═══════════════════════════════════════════════════════

  if (step === 1) {
    return (
      <View style={styles.container}>
        {/* 서울 스카이라인 배경 */}
        <SeoulSkyline />

        <Animated.View style={[
          styles.step1Content,
          { opacity: slideAnim, transform: [{ translateY: slideAnim.interpolate({
            inputRange: [0, 1], outputRange: [30, 0],
          }) }] },
        ]}>
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.step1Scroll} showsVerticalScrollIndicator={false}>
              {/* 헤더 */}
              <View style={styles.welcomeHeader}>
                <Text style={styles.welcomeTitle}>Welcome to K-Beauty</Text>
                <Text style={styles.welcomeSubtitle}>
                  Discover premium cosmetic procedures{'\n'}at Korea's top clinics
                </Text>
              </View>

              {/* 언어 선택 */}
              <Text style={styles.chooseLangTitle}>Choose Your Language</Text>
              <Text style={styles.chooseLangSub}>
                {'\u8A00\u8A9E\u3092\u9078\u629E'} / {'\u9009\u62E9\u8BED\u8A00'}
              </Text>

              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = selectedLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langBtn, isActive && styles.langBtnActive]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedLang(lang.code)}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                      {lang.label}
                    </Text>
                    {isActive && (
                      <View style={styles.langCheck}>
                        <Text style={styles.langCheckText}>{'\u2713'}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* 계속 버튼 */}
              <TouchableOpacity
                style={styles.nextBtn}
                activeOpacity={0.8}
                onPress={handleLanguageNext}
              >
                <Text style={styles.nextBtnText}>Continue {'\u2192'}</Text>
              </TouchableOpacity>

              {/* 한국어 앱 링크 */}
              <TouchableOpacity
                style={styles.koreanLink}
                onPress={() => {
                  // 기존 한국인 앱으로 이동 (딥링크 또는 안내)
                  Linking.openURL('beautycare://home').catch(() => {});
                }}
              >
                <Text style={styles.koreanLinkText}>
                  {'\uD55C\uAD6D\uC5B4'} {'\u{1F1F0}\u{1F1F7}'} Korean App
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════
  // Step 2: 여행 일정 + 관심 시술
  // ═══════════════════════════════════════════════════════

  return (
    <SafeAreaView style={styles.containerWhite}>
      <Animated.View style={[
        { flex: 1 },
        { opacity: slideAnim, transform: [{ translateY: slideAnim.interpolate({
          inputRange: [0, 1], outputRange: [30, 0],
        }) }] },
      ]}>
        <ScrollView
          contentContainerStyle={styles.step2Scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 진행 표시 */}
          <View style={styles.progressRow}>
            <View style={styles.progressDotDone} />
            <View style={styles.progressLine} />
            <View style={styles.progressDotActive} />
          </View>

          {/* 여행 일정 */}
          <Text style={styles.step2Title}>{L.whenVisit}</Text>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>{L.arrival}</Text>
              <TextInput
                style={styles.dateInput}
                placeholder={L.dateHint}
                placeholderTextColor="#D1D5DB"
                value={arrivalDate}
                onChangeText={setArrivalDate}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
            <Text style={styles.dateSeparator}>{'\u2192'}</Text>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>{L.departure}</Text>
              <TextInput
                style={styles.dateInput}
                placeholder={L.dateHint}
                placeholderTextColor="#D1D5DB"
                value={departureDate}
                onChangeText={setDepartureDate}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          </View>

          {/* 관심 시술 */}
          <Text style={[styles.step2Title, { marginTop: 32 }]}>{L.whatInterest}</Text>
          <Text style={styles.step2Sub}>{L.selectMultiple}</Text>

          <View style={styles.interestGrid}>
            {INTEREST_OPTIONS.map((opt) => {
              const isSelected = interests.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.interestChip, isSelected && styles.interestChipActive]}
                  activeOpacity={0.7}
                  onPress={() => toggleInterest(opt.key)}
                >
                  <Text style={styles.interestIcon}>{opt.icon}</Text>
                  <Text style={[styles.interestLabel, isSelected && styles.interestLabelActive]}>
                    {opt.labelMap[selectedLang]}
                  </Text>
                  {isSelected && (
                    <View style={styles.interestCheck}>
                      <Text style={styles.interestCheckText}>{'\u2713'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 완료 버튼 */}
          <TouchableOpacity
            style={styles.doneBtn}
            activeOpacity={0.8}
            onPress={handleComplete}
          >
            <Text style={styles.doneBtnText}>{L.done}</Text>
          </TouchableOpacity>

          {/* 스킵 */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleComplete}
          >
            <Text style={styles.skipBtnText}>{L.skip}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════
// 스타일
// ═══════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // ─── 공통 ──────────────────────────────────────────
  container: { flex: 1, backgroundColor: '#0F172A' },
  containerWhite: { flex: 1, backgroundColor: '#FFFFFF' },

  // ─── Step 0: 스플래시 ──────────────────────────────
  splashContainer: {
    flex: 1, backgroundColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center',
  },
  splashContent: { alignItems: 'center' },
  splashEmoji: { fontSize: 64 },
  splashTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginTop: 20 },
  splashSubtitle: { fontSize: 15, fontWeight: '600', color: '#E8772E', marginTop: 6 },

  loadingDots: { flexDirection: 'row', marginTop: 40, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#475569' },
  dot1: { backgroundColor: '#E8772E' },
  dot2: { backgroundColor: '#F59E0B', opacity: 0.7 },
  dot3: { backgroundColor: '#F59E0B', opacity: 0.4 },

  // ─── 서울 스카이라인 ───────────────────────────────
  skylineContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
  },
  skylineBg: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },

  tower: { alignItems: 'center', position: 'absolute', bottom: 80, zIndex: 2 },
  towerTop: { width: 4, height: 20, backgroundColor: '#E8772E', borderRadius: 2 },
  towerBody: { width: 8, height: 30, backgroundColor: '#334155', borderRadius: 2 },
  towerBase: { width: 24, height: 8, backgroundColor: '#334155', borderRadius: 4 },

  buildings: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 4,
    paddingHorizontal: 20, paddingBottom: 0,
  },
  building: {
    backgroundColor: '#1E293B', borderTopLeftRadius: 3, borderTopRightRadius: 3,
    opacity: 0.6,
  },

  // ─── Step 1: 언어 선택 ─────────────────────────────
  step1Content: { flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  step1Scroll: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },

  welcomeHeader: { alignItems: 'center', marginBottom: 36 },
  welcomeTitle: { fontSize: 30, fontWeight: '800', color: '#FFFFFF' },
  welcomeSubtitle: {
    fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 22,
  },

  chooseLangTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  chooseLangSub: {
    fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 20,
  },

  langBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18,
    borderRadius: 16, borderWidth: 2, borderColor: '#334155',
    backgroundColor: '#1E293B', marginBottom: 12,
  },
  langBtnActive: {
    borderColor: '#3B82F6', backgroundColor: '#1E3A5F',
  },
  langFlag: { fontSize: 30, marginRight: 16 },
  langLabel: { flex: 1, fontSize: 19, fontWeight: '700', color: '#94A3B8' },
  langLabelActive: { color: '#FFFFFF' },
  langCheck: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F6',
    alignItems: 'center', justifyContent: 'center',
  },
  langCheckText: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },

  nextBtn: {
    height: 56, backgroundColor: '#3B82F6', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
    ...Platform.select({
      ios: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  koreanLink: { marginTop: 24, alignItems: 'center', paddingVertical: 8 },
  koreanLinkText: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  // ─── Step 2: 여행 일정 ─────────────────────────────
  step2Scroll: { paddingHorizontal: 24, paddingTop: 24 },

  progressRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },
  progressDotDone: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#3B82F6',
  },
  progressLine: {
    width: 40, height: 2, backgroundColor: '#3B82F6', marginHorizontal: 8,
  },
  progressDotActive: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF',
    borderWidth: 2, borderColor: '#3B82F6',
  },

  step2Title: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginBottom: 16 },
  step2Sub: { fontSize: 13, color: '#9CA3AF', marginTop: -8, marginBottom: 16 },

  // 날짜 입력
  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  dateInput: {
    height: 48, backgroundColor: '#F9FAFB', borderRadius: 12,
    paddingHorizontal: 14, fontSize: 15, color: '#1F2937',
    borderWidth: 1.5, borderColor: '#E5E7EB', textAlign: 'center',
    fontWeight: '600',
  },
  dateSeparator: { fontSize: 18, color: '#9CA3AF', marginTop: 18 },

  // 관심 시술 그리드
  interestGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  interestChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    width: (SCREEN_WIDTH - 48 - 10) / 2, // 2열 그리드
  },
  interestChipActive: {
    borderColor: '#3B82F6', backgroundColor: '#EFF6FF',
  },
  interestIcon: { fontSize: 18, marginRight: 8 },
  interestLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: '#4B5563' },
  interestLabelActive: { color: '#1D4ED8' },
  interestCheck: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#3B82F6',
    alignItems: 'center', justifyContent: 'center',
  },
  interestCheckText: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },

  // 완료 버튼
  doneBtn: {
    height: 56, backgroundColor: '#3B82F6', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 32,
    ...Platform.select({
      ios: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  doneBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  skipBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  skipBtnText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
});
