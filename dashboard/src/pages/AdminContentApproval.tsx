import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';

// ─── 타입 정의 ─────────────────────────────────────────

interface PendingContent {
  feed_id: string;
  description: string;
  category: string;
  photo_urls: string[];
  pricing_info: string | null;
  hospital_name: string;
  created_at: string;
}

// 날짜 포맷 헬퍼
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 슈퍼 관리자 - 콘텐츠 승인 관리 페이지 */
export default function AdminContentApproval() {
  const [contents, setContents] = useState<PendingContent[]>([]);
  const [loading, setLoading] = useState(true);

  // 승인/반려 확인 모달 상태
  const [actionTarget, setActionTarget] = useState<{
    feedId: string;
    action: 'approve' | 'reject';
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  // ─── 데이터 로드 ───────────────────────────────────────

  const loadPendingContents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/admin/feed/pending');
      setContents(data.data || []);
    } catch {
      // 로드 실패
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingContents();
  }, [loadPendingContents]);

  // ─── 승인/반려 처리 ────────────────────────────────────

  const handleAction = async () => {
    if (!actionTarget) return;
    setProcessing(true);

    try {
      await client.patch(`/admin/feed/${actionTarget.feedId}/${actionTarget.action}`);
      // 목록에서 제거
      setContents((prev) => prev.filter((c) => c.feed_id !== actionTarget.feedId));
    } catch {
      // 처리 실패
    } finally {
      setProcessing(false);
      setActionTarget(null);
    }
  };

  // ─── 렌더링 ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">콘텐츠 승인 관리</h2>
        <p className="text-sm text-gray-500 mt-0.5">병원에서 등록한 콘텐츠를 검토하고 승인하세요</p>
      </div>

      {/* 대기 건수 */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 inline-block">
          <span className="text-sm text-gray-500">승인 대기</span>
          <span className={`ml-2 font-bold ${contents.length > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
            {contents.length}건
          </span>
        </div>
      )}

      {/* 콘텐츠 그리드 */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-8 h-8 border-3 border-[#1E5FA8] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : contents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          승인 대기 중인 콘텐츠가 없습니다
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contents.map((item) => (
            <div
              key={item.feed_id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* 사진 미리보기 */}
              {item.photo_urls && item.photo_urls.length > 0 ? (
                <img
                  src={item.photo_urls[0]}
                  alt="콘텐츠 미리보기"
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* 카드 본문 */}
              <div className="p-4 space-y-3">
                {/* 병원명 + 카테고리 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{item.hospital_name}</span>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {item.category}
                  </span>
                </div>

                {/* 설명 (최대 3줄) */}
                <p className="text-sm text-gray-600 line-clamp-3">{item.description}</p>

                {/* 가격 정보 */}
                {item.pricing_info && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500 mb-0.5">비급여 가격 정보</p>
                    <p className="text-sm text-gray-700">{item.pricing_info}</p>
                  </div>
                )}

                {/* 등록일 */}
                <p className="text-xs text-gray-400">{formatDate(item.created_at)}</p>

                {/* 승인/반려 버튼 */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setActionTarget({ feedId: item.feed_id, action: 'reject' })}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    반려
                  </button>
                  <button
                    onClick={() => setActionTarget({ feedId: item.feed_id, action: 'approve' })}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    승인
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── 확인 모달 ────────────────────────────────────── */}
      {actionTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h4 className="font-bold text-gray-900 mb-2">
              {actionTarget.action === 'approve' ? '콘텐츠 승인' : '콘텐츠 반려'}
            </h4>
            <p className="text-sm text-gray-600 mb-5">
              이 콘텐츠를 {actionTarget.action === 'approve' ? '승인' : '반려'}하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setActionTarget(null)}
                disabled={processing}
                className="flex-1 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={`flex-1 py-2.5 text-sm text-white rounded-lg transition-colors disabled:opacity-50 ${
                  actionTarget.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing
                  ? '처리 중...'
                  : actionTarget.action === 'approve'
                    ? '승인'
                    : '반려'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
