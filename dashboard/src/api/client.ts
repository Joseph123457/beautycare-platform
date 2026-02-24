import axios from 'axios';

/**
 * API 클라이언트 기본 설정
 * - baseURL: Vite 프록시를 통해 백엔드(localhost:3000)로 전달
 * - 인터셉터: 자동 토큰 주입 + 만료 시 리프레시
 */
const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// 요청 인터셉터: Authorization 헤더에 액세스 토큰 자동 주입
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401 TOKEN_EXPIRED → 리프레시 시도
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // 토큰 만료 + 아직 재시도 안 한 경우
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      original._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });

        // 새 액세스 토큰 저장
        localStorage.setItem('accessToken', data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;

        return client(original);
      } catch {
        // 리프레시도 실패 → 로그아웃 처리
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default client;
