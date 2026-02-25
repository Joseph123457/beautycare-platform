/**
 * 언어 선택 온보딩 화면
 * 앱 첫 실행 시 표시. 영어/일본어/중국어 중 선택.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useLanguage } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../i18n';
import { RootStackParamList } from '../types';

type Nav = StackNavigationProp<RootStackParamList>;

export default function LanguageSelectScreen() {
  const navigation = useNavigation<Nav>();
  const { language, changeLanguage, completeOnboarding } = useLanguage();
  const [selected, setSelected] = useState<LanguageCode>(language);

  // 언어 선택 완료 처리
  const handleContinue = async () => {
    await changeLanguage(selected);
    await completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 로고 영역 */}
        <View style={styles.logoSection}>
          <Text style={styles.logoEmoji}>{'\u2728'}</Text>
          <Text style={styles.logoTitle}>BeautyCare Global</Text>
          <Text style={styles.logoSubtitle}>K-Beauty Medical Tourism</Text>
        </View>

        {/* 언어 선택 영역 */}
        <View style={styles.languageSection}>
          <Text style={styles.sectionTitle}>Choose Your Language</Text>
          <Text style={styles.sectionSubtitle}>
            {'\u8A00\u8A9E\u3092\u9078\u629E / \u9009\u62E9\u8BED\u8A00'}
          </Text>

          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = selected === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langOption, isActive && styles.langOptionActive]}
                activeOpacity={0.7}
                onPress={() => setSelected(lang.code)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                  {lang.label}
                </Text>
                {isActive && (
                  <View style={styles.checkCircle}>
                    <Text style={styles.checkMark}>{'\u2713'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 계속하기 버튼 */}
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.8}
          onPress={handleContinue}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },

  // 로고
  logoSection: { alignItems: 'center', marginBottom: 48 },
  logoEmoji: { fontSize: 56 },
  logoTitle: { fontSize: 28, fontWeight: '800', color: '#1F2937', marginTop: 16 },
  logoSubtitle: { fontSize: 14, color: '#E8772E', fontWeight: '600', marginTop: 4 },

  // 언어 선택
  languageSection: { marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  sectionSubtitle: {
    fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4, marginBottom: 20,
  },

  langOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18,
    borderRadius: 16, borderWidth: 2, borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF', marginBottom: 12,
  },
  langOptionActive: {
    borderColor: '#E8772E', backgroundColor: '#FFF7ED',
  },
  langFlag: { fontSize: 28, marginRight: 16 },
  langLabel: { flex: 1, fontSize: 18, fontWeight: '600', color: '#4B5563' },
  langLabelActive: { color: '#1F2937' },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8772E',
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },

  // 계속 버튼
  continueBtn: {
    height: 56, backgroundColor: '#E8772E', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#E8772E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
