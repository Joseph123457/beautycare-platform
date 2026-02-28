import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';

// ─── 타입 정의 ─────────────────────────────────────────

interface Hospital {
  hospital_id: string;
  name: string;
  category: string;
  owner_name: string;
  avg_rating: number;
  review_count: number;
  is_verified: boolean;
  created_at: string;
}

// 카테고리 필터 목록
const CATEGORIES = ['전체', '성형외과', '피부과', '치과', '안과', '한의원'];

// 날짜 포맷 헬퍼
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 슈퍼 관리자 - 병원 관리 페이지 */
export default function AdminHospitals() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('전체');
  const [page, setPage] = useState(1);
  const limit = 20;

  // ─── 데이터 로드 ───────────────────────────────────────

  const loadHospitals = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (category !== '전체') params.category = category;

      const { data } = await client.get('/admin/hospitals', { params });
      setHospitals(data.data || []);
    } catch {
      // 로드 실패
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    loadHospitals();
  }, [loadHospitals]);

  // 검색 시 페이지 초기화
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  // ─── 렌더링 ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">병원 관리</h2>
        <p className="text-sm text-gray-500 mt-0.5">등록된 병원을 조회하고 관리하세요</p>
      </div>

      {/* 필터 영역 */}
      <div className="flex flex-wrap gap-3">
        {/* 검색 */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="병원명으로 검색..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
          />
        </div>

        {/* 카테고리 필터 */}
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-8 h-8 border-3 border-[#1E5FA8] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : hospitals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          조건에 맞는 병원이 없습니다
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">병원명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">카테고리</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">운영자</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">평균 평점</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">리뷰 수</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">인증</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {hospitals.map((h) => (
                <tr key={h.hospital_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{h.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{h.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{h.owner_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-[#E8772E]">
                      {h.avg_rating ? Number(h.avg_rating).toFixed(1) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{h.review_count || 0}</td>
                  <td className="px-4 py-3">
                    {h.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        인증됨
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">미인증</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(h.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {!loading && hospitals.length > 0 && (
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
            disabled={hospitals.length < limit}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
