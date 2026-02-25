/**
 * 마이 페이지 화면
 * 로그인/프로필 + 언어 변경 + 메뉴
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../i18n';

export default function ProfileScreen() {
  const { user, loading, login, logout } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();

  // 로그인 폼
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');

  // 언어 선택 모달
  const [showLangModal, setShowLangModal] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('profile.loginError'));
      return;
    }
    setLoginLoading(true);
    setError('');
    const success = await login(email, password);
    if (!success) setError(t('profile.loginError'));
    setLoginLoading(false);
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleLanguageChange = async (lang: LanguageCode) => {
    await changeLanguage(lang);
    setShowLangModal(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#E8772E" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  // 현재 언어 표시
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language);

  // 비로그인: 로그인 폼
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.loginContainer}>
          <View style={styles.loginHeader}>
            <Text style={{ fontSize: 48 }}>{'\u2728'}</Text>
            <Text style={styles.loginTitle}>BeautyCare Global</Text>
            <Text style={styles.loginSubtitle}>{t('profile.loginSubtitle')}</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder={t('profile.email')}
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={t('profile.password')}
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.loginBtn, loginLoading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loginLoading}
          >
            {loginLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginBtnText}>{t('profile.loginBtn')}</Text>
            )}
          </TouchableOpacity>

          {/* 언어 변경 (비로그인에서도 가능) */}
          <TouchableOpacity
            style={styles.langChangeBtn}
            onPress={() => setShowLangModal(true)}
          >
            <Text style={styles.langChangeBtnText}>
              {currentLang?.flag} {t('profile.language')}: {currentLang?.label}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 언어 모달 */}
        <LanguageModal
          visible={showLangModal}
          current={language}
          onSelect={handleLanguageChange}
          onClose={() => setShowLangModal(false)}
        />
      </SafeAreaView>
    );
  }

  // 로그인 상태: 프로필
  const menuItems = [
    { icon: '\u{1F4CB}', label: t('profile.bookingHistory'), onPress: () => {} },
    { icon: '\u2B50', label: t('profile.myReviews'), onPress: () => {} },
    { icon: '\u2764\uFE0F', label: t('profile.savedClinics'), onPress: () => {} },
    { icon: '\u{1F514}', label: t('profile.notifications'), onPress: () => {} },
    {
      icon: '\u{1F310}',
      label: `${t('profile.language')}: ${currentLang?.label}`,
      onPress: () => setShowLangModal(true),
    },
    { icon: '\u2753', label: t('profile.helpCenter'), onPress: () => {} },
    { icon: '\u{1F4C4}', label: t('profile.terms'), onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.title')}</Text>
        </View>

        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 28 }}>{user.name.charAt(0)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
          </View>
        </View>

        {/* 메뉴 */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>{'\u203A'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>{t('profile.logout')}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>{t('profile.version')}</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 언어 모달 */}
      <LanguageModal
        visible={showLangModal}
        current={language}
        onSelect={handleLanguageChange}
        onClose={() => setShowLangModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── 언어 선택 모달 ────────────────────────────────────

function LanguageModal({ visible, current, onSelect, onClose }: {
  visible: boolean;
  current: LanguageCode;
  onSelect: (lang: LanguageCode) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Language</Text>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = current === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langOption, isActive && styles.langOptionActive]}
                onPress={() => onSelect(lang.code)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                  {lang.label}
                </Text>
                {isActive && <Text style={styles.langCheck}>{'\u2713'}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937' },

  // 프로필
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, padding: 16,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  profileEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  // 메뉴
  menuSection: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  menuIcon: { fontSize: 18, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1F2937' },
  menuArrow: { fontSize: 18, color: '#9CA3AF' },

  // 로그아웃
  logoutBtn: {
    marginHorizontal: 16, marginTop: 20,
    paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  logoutBtnText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  version: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 20 },

  // 로그인 폼
  loginContainer: { paddingHorizontal: 24, paddingTop: 60 },
  loginHeader: { alignItems: 'center', marginBottom: 32 },
  loginTitle: { fontSize: 24, fontWeight: '700', color: '#E8772E', marginTop: 12 },
  loginSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  input: {
    height: 50, backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 16, fontSize: 14, color: '#1F2937',
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
  },
  loginBtn: {
    height: 50, backgroundColor: '#E8772E', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  loginBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center', marginBottom: 12 },

  langChangeBtn: {
    marginTop: 20, paddingVertical: 12, alignItems: 'center',
  },
  langChangeBtnText: { fontSize: 14, fontWeight: '600', color: '#E8772E' },

  // 언어 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalContent: {
    width: '80%', backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginBottom: 16 },

  langOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  langOptionActive: { borderColor: '#E8772E', backgroundColor: '#FFF7ED' },
  langFlag: { fontSize: 24, marginRight: 12 },
  langLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#4B5563' },
  langLabelActive: { color: '#1F2937' },
  langCheck: { fontSize: 18, fontWeight: '700', color: '#E8772E' },
});
