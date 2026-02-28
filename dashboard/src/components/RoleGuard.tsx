/**
 * 역할 기반 접근 제어 래퍼
 * FeatureLock 패턴과 유사하게 권한 없는 사용자에게 잠금 화면 표시
 *
 * 사용 예:
 *   <RoleGuard currentRole="HOSPITAL_ADMIN" requiredRoles={['SUPER_ADMIN']}>
 *     <AdminPage />
 *   </RoleGuard>
 */

interface RoleGuardProps {
  currentRole: string;
  requiredRoles: string[];
  children: React.ReactNode;
}

export default function RoleGuard({ currentRole, requiredRoles, children }: RoleGuardProps) {
  // 현재 역할이 허용 목록에 포함되면 자식 렌더링
  if (requiredRoles.includes(currentRole)) {
    return <>{children}</>;
  }

  // 접근 불가 화면
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
        <svg
          className="w-7 h-7 text-[#1E5FA8]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-900">접근 권한이 없습니다</p>
        <p className="text-xs text-gray-500 mt-1">이 페이지는 관리자 전용입니다</p>
      </div>
    </div>
  );
}
