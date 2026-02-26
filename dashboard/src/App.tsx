import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Reviews from './pages/Reviews';
import Subscription from './pages/Subscription';
import Chats from './pages/Chats';
import Patients from './pages/Patients';
import Analytics from './pages/Analytics';
import ProfilePage from './pages/ProfilePage';

/** 루트 컴포넌트 – 라우팅 및 인증 관리 */
export default function App() {
  const { user, loading, error, isAuthenticated, login, logout } = useAuth();

  // 초기 토큰 확인 중 로딩
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-[#1E5FA8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인 페이지 */}
        <Route
          path="/login"
          element={
            <Login
              isAuthenticated={isAuthenticated}
              onLogin={login}
              error={error}
            />
          }
        />

        {/* 인증이 필요한 페이지 */}
        <Route
          element={
            isAuthenticated ? (
              <Layout userName={user?.name || ''} onLogout={logout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="chats" element={<Chats />} />
          <Route path="patients" element={<Patients />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* 존재하지 않는 경로 → 홈으로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
