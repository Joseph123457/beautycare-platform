import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';

// ─── 타입 정의 ─────────────────────────────────────────

interface UserItem {
  user_id: string;
  name: string;
  email: string;
  role: 'PATIENT' | 'HOSPITAL_ADMIN' | 'SUPER_ADMIN';
  created_at: string;
}

// 역할 뱃지 스타일 매핑
const ROLE_STYLES: Record<string, { label: string; className: string }> = {
  PATIENT: { label: 'PATIENT', className: 'bg-gray-100 text-gray-800' },
  HOSPITAL_ADMIN: { label: 'HOSPITAL_ADMIN', className: 'bg-blue-100 text-blue-800' },
  SUPER_ADMIN: { label: 'SUPER_ADMIN', className: 'bg-purple-100 text-purple-800' },
};

// 역할 옵션
const ROLES = ['PATIENT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'] as const;

// 날짜 포맷 헬퍼
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 슈퍼 관리자 - 사용자 관리 페이지 */
export default function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // 역할 변경 확인 상태
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    userId: string;
    userName: string;
    newRole: string;
  } | null>(null);

  // ─── 데이터 로드 ───────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (search.trim()) params.search = search.trim();

      const { data } = await client.get('/admin/users', { params });
      setUsers(data.data || []);
    } catch {
      // 로드 실패
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 검색 시 페이지 초기화
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // ─── 역할 변경 ────────────────────────────────────────

  const handleRoleChange = async () => {
    if (!roleChangeTarget) return;
    try {
      await client.patch(`/admin/users/${roleChangeTarget.userId}/role`, {
        role: roleChangeTarget.newRole,
      });
      // 로컬 상태 업데이트
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === roleChangeTarget.userId
            ? { ...u, role: roleChangeTarget.newRole as UserItem['role'] }
            : u
        )
      );
    } catch {
      // 역할 변경 실패
    } finally {
      setRoleChangeTarget(null);
    }
  };

  // ─── 렌더링 ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">사용자 관리</h2>
        <p className="text-sm text-gray-500 mt-0.5">등록된 사용자를 조회하고 역할을 관리하세요</p>
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="이름 또는 이메일로 검색..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
        />
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-8 h-8 border-3 border-[#1E5FA8] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          조건에 맞는 사용자가 없습니다
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">이름</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">이메일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">역할</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">가입일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">역할 변경</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => {
                const roleStyle = ROLE_STYLES[u.role] || ROLE_STYLES.PATIENT;
                return (
                  <tr key={u.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleStyle.className}`}>
                        {roleStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          setRoleChangeTarget({
                            userId: u.user_id,
                            userName: u.name,
                            newRole: e.target.value,
                          })
                        }
                        className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {!loading && users.length > 0 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            이전
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">{page} 페이지</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={users.length < limit}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}

      {/* ─── 역할 변경 확인 모달 ─────────────────────────── */}
      {roleChangeTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h4 className="font-bold text-gray-900 mb-2">역할 변경 확인</h4>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{roleChangeTarget.userName}</strong> 사용자의 역할을{' '}
              <strong>{roleChangeTarget.newRole}</strong>(으)로 변경하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setRoleChangeTarget(null)}
                className="flex-1 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRoleChange}
                className="flex-1 py-2.5 text-sm bg-[#1E5FA8] text-white rounded-lg hover:bg-[#174d8a] transition-colors"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
