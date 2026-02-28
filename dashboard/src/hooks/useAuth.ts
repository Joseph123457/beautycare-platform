import { useState, useCallback, useEffect } from 'react';
import client from '../api/client';

interface User {
  user_id: string;
  email: string;
  name: string;
  hospital_id: string | null;
  role: 'PATIENT' | 'HOSPITAL_ADMIN' | 'SUPER_ADMIN';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * 로그인 상태 관리 훅
 * - localStorage에 토큰 저장/삭제
 * - 로그인/로그아웃 함수 제공
 * - 페이지 새로고침 시 토큰 유효성 확인
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // 페이지 로드 시 토큰이 있으면 사용자 정보 복원
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setState({ user: JSON.parse(savedUser), loading: false, error: null });
      } catch {
        localStorage.clear();
        setState({ user: null, loading: false, error: null });
      }
    } else {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // 로그인
  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data } = await client.post('/auth/login', { email, password });

      const user = data.data.user;
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      setState({ user, loading: false, error: null });
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message || '로그인에 실패했습니다';
      setState({ user: null, loading: false, error: message });
      return false;
    }
  }, []);

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout');
    } catch {
      // 서버 로그아웃 실패해도 로컬은 정리
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setState({ user: null, loading: false, error: null });
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    login,
    logout,
  };
}
