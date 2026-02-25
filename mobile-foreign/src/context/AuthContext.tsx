/**
 * 인증 컨텍스트
 * 로그인/로그아웃 상태 관리 + AsyncStorage 연동
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 저장된 사용자 정보 복원
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const savedUser = await AsyncStorage.getItem('user');
        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch {
        // 파싱 실패 시 무시
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 로그인
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const { data } = await client.post('/auth/login', { email, password });
      const userData = data.data.user;

      await AsyncStorage.setItem('accessToken', data.data.accessToken);
      await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      return true;
    } catch {
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
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
