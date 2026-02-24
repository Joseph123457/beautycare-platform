import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';

interface LoginProps {
  isAuthenticated: boolean;
  onLogin: (email: string, password: string) => Promise<boolean>;
  error: string | null;
}

/** 로그인 페이지 */
export default function Login({ isAuthenticated, onLogin, error }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 이미 로그인되어 있으면 대시보드로 리다이렉트
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onLogin(email, password);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#1E5FA8] rounded-2xl mx-auto flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">BC</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">뷰티케어 대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">병원 관리자 로그인</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hospital@example.com"
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-[#1E5FA8] text-white rounded-lg text-sm font-medium
                       hover:bg-[#1E5FA8]/90 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {submitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 테스트 계정 안내 */}
        <p className="text-center text-xs text-gray-400 mt-4">
          테스트: hospital1@test.com / test1234
        </p>
      </div>
    </div>
  );
}
