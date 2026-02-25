/**
 * API 클라이언트
 * 백엔드 서버와 통신하는 axios 인스턴스
 * Accept-Language 헤더 자동 주입으로 다국어 응답 지원
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

// 개발 환경에서는 로컬 서버 주소 사용
const BASE_URL = __DEV__
  ? 'http://10.0.2.2:3000/api'  // Android 에뮬레이터
  : 'https://api.beautycare.com/api';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// 요청 인터셉터: 토큰 + Accept-Language 자동 주입
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 현재 선택된 언어를 Accept-Language 헤더로 전달
  config.headers['Accept-Language'] = i18n.language || 'en';

  return config;
});

// 응답 인터셉터: 401 시 토큰 갱신 시도
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      original._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });

        await AsyncStorage.setItem('accessToken', data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;

        return client(original);
      } catch {
        // 갱신 실패 → 토큰 삭제 (AuthContext에서 로그아웃 감지)
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
