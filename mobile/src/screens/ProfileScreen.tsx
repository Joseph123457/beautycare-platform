/**
 * 마이 페이지 화면
 * 사용자 정보, 메뉴, 로그인/로그아웃
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, loading, login, logout } = useAuth();

  // 로그인 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');

  // 로그인 처리
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요');
      return;
    }
    setLoginLoading(true);
    setError('');
    const success = await login(email, password);
    if (!success) {
      setError('이메일 또는 비밀번호가 일치하지 않습니다');
    }
    setLoginLoading(false);
  };

  // 로그아웃 처리
  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1E5FA8" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  // 비로그인: 로그인 폼
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.loginContainer}>
          <View style={styles.loginHeader}>
            <Text style={{ fontSize: 48 }}>🏥</Text>
            <Text style={styles.loginTitle}>뷰티케어</Text>
            <Text style={styles.loginSubtitle}>로그인하여 예약을 관리하세요</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
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
              <Text style={styles.loginBtnText}>로그인</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 로그인 상태: 프로필
  const menuItems = [
    { icon: '📋', label: '예약 내역', onPress: () => {} },
    { icon: '⭐', label: '내가 쓴 리뷰', onPress: () => {} },
    { icon: '❤️', label: '찜한 병원', onPress: () => {} },
    { icon: '🔔', label: '알림 설정', onPress: () => {} },
    { icon: '❓', label: '고객센터', onPress: () => {} },
    { icon: '📄', label: '이용약관', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>마이페이지</Text>
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
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>로그아웃</Text>
        </TouchableOpacity>

        {/* 앱 버전 */}
        <Text style={styles.version}>뷰티케어 v1.0.0</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937' },

  // 프로필 카드
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, padding: 16,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#EBF2FA',
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

  version: {
    textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 20,
  },

  // 로그인 폼
  loginContainer: { paddingHorizontal: 24, paddingTop: 60 },
  loginHeader: { alignItems: 'center', marginBottom: 32 },
  loginTitle: { fontSize: 24, fontWeight: '700', color: '#1E5FA8', marginTop: 12 },
  loginSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  input: {
    height: 50, backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 16, fontSize: 14, color: '#1F2937',
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
  },
  loginBtn: {
    height: 50, backgroundColor: '#1E5FA8', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  loginBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  errorText: {
    fontSize: 13, color: '#DC2626', textAlign: 'center', marginBottom: 12,
  },
});
