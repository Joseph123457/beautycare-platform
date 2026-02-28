/**
 * 회원가입 화면
 * 이메일, 비밀번호, 이름, 전화번호 입력 → 가입 처리
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function SignupScreen() {
  const navigation = useNavigation();
  const { signup } = useAuth();

  // 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── 유효성 검사 ──────────────────────────────────────
  const validate = (): boolean => {
    if (!email.trim() || !password.trim() || !name.trim() || !phone.trim()) {
      setError('모든 항목을 입력해주세요');
      return false;
    }
    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('올바른 이메일 형식을 입력해주세요');
      return false;
    }
    // 비밀번호 최소 길이
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다');
      return false;
    }
    return true;
  };

  // ─── 회원가입 처리 ────────────────────────────────────
  const handleSignup = async () => {
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const success = await signup(email.trim(), password, name.trim(), phone.trim());
      if (!success) {
        setError('회원가입에 실패했습니다. 다시 시도해주세요.');
      }
      // 성공 시 user 상태 변경으로 자동 네비게이션
    } catch {
      setError('서버 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={{ fontSize: 48 }}>🏥</Text>
          <Text style={styles.title}>뷰티케어</Text>
          <Text style={styles.subtitle}>새 계정을 만들어보세요</Text>
        </View>

        {/* 에러 메시지 */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* 입력 폼 */}
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
          placeholder="비밀번호 (6자 이상)"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="이름"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="전화번호"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        {/* 가입 버튼 */}
        <TouchableOpacity
          style={[styles.signupBtn, loading && { opacity: 0.6 }]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signupBtnText}>회원가입</Text>
          )}
        </TouchableOpacity>

        {/* 로그인 링크 */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.loginLinkText}>
            이미 계정이 있으신가요? <Text style={styles.loginLinkBold}>로그인</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 스타일 ────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },

  // ─── 헤더 ─────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E5FA8',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  // ─── 입력 ─────────────────────────────────────────────
  input: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },

  // ─── 가입 버튼 ────────────────────────────────────────
  signupBtn: {
    height: 50,
    backgroundColor: '#1E5FA8',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  signupBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── 로그인 링크 ──────────────────────────────────────
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLinkBold: {
    color: '#1E5FA8',
    fontWeight: '600',
  },

  // ─── 에러 ─────────────────────────────────────────────
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
});
