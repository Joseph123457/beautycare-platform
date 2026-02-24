import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

interface LayoutProps {
  userName: string;
  onLogout: () => void;
}

/* ── 사이드바 메뉴 항목 ─────────────────────────────── */
const menuItems = [
  {
    to: '/',
    label: '대시보드',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
  },
  {
    to: '/reservations',
    label: '예약 관리',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: '/reviews',
    label: '리뷰 관리',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];

/**
 * 사이드바 + 헤더 레이아웃
 * - 데스크탑: 고정 사이드바 (w-60)
 * - 모바일: 햄버거 메뉴로 열림/닫힘
 */
export default function Layout({ userName, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-white/15 text-white'
        : 'text-white/60 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ── 모바일 오버레이 ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── 사이드바 ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-60 bg-[#1E5FA8] flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* 로고 */}
        <div className="px-5 py-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-[#1E5FA8] font-bold text-sm">BC</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">뷰티케어</h1>
            <p className="text-white/50 text-[10px]">병원 관리 대시보드</p>
          </div>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 px-3 mt-2 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={linkClass}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 하단: 사용자 정보 + 로그아웃 */}
        <div className="px-3 pb-5 space-y-2">
          <div className="px-4 py-2 text-white/60 text-xs">
            <span className="text-white font-medium">{userName}</span> 님
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 메인 영역 ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 헤더 */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 shrink-0">
          {/* 햄버거 버튼 (모바일만) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 -ml-1.5 rounded-md hover:bg-gray-100"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
