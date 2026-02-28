import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import ImageUploader from '../components/ImageUploader';

// ─── 타입 정의 ─────────────────────────────────────────

interface FeedContent {
  feed_id: string;
  description: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  view_count: number;
  photo_urls: string[];
  pricing_info: string | null;
  tags: string[];
  created_at: string;
}

// 카테고리 목록
const CATEGORIES = ['성형외과', '피부과', '치과', '안과', '한의원'];

// 상태 뱃지 스타일 매핑
const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: '대기중', className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인됨', className: 'bg-green-100 text-green-800' },
  rejected: { label: '반려됨', className: 'bg-red-100 text-red-800' },
};

// 날짜 포맷 헬퍼
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 병원 관리자 콘텐츠 관리 페이지 */
export default function ContentManagement() {
  const [contents, setContents] = useState<FeedContent[]>([]);
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 폼 상태
  const [images, setImages] = useState<File[]>([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [pricingInfo, setPricingInfo] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 삭제 확인 상태
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ─── 데이터 로드 ───────────────────────────────────────

  const loadContents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/feed/hospital/mine');
      setContents(data.data || []);
    } catch {
      // 로드 실패 시 빈 배열 유지
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  // ─── 모달 열기/닫기 ────────────────────────────────────

  const openCreateModal = () => {
    setEditingId(null);
    setImages([]);
    setCategory(CATEGORIES[0]);
    setDescription('');
    setPricingInfo('');
    setTags('');
    setShowModal(true);
  };

  const openEditModal = (content: FeedContent) => {
    setEditingId(content.feed_id);
    setImages([]); // 기존 이미지는 서버에 있으므로 새 파일만 선택
    setCategory(content.category);
    setDescription(content.description);
    setPricingInfo(content.pricing_info || '');
    setTags(content.tags?.join(', ') || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  // ─── 저장 (생성/수정) ──────────────────────────────────

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('description', description.trim());
      formData.append('category', category);
      if (pricingInfo.trim()) formData.append('pricing_info', pricingInfo.trim());
      if (tags.trim()) {
        formData.append('tags', JSON.stringify(tags.split(',').map((t) => t.trim()).filter(Boolean)));
      }
      // 이미지 첨부
      images.forEach((file) => formData.append('photos', file));

      if (editingId) {
        // 수정
        await client.put(`/feed/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // 생성
        await client.post('/feed', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      closeModal();
      loadContents();
    } catch {
      // 에러 처리
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 삭제 ──────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await client.delete(`/feed/${deleteTarget}`);
      setContents((prev) => prev.filter((c) => c.feed_id !== deleteTarget));
    } catch {
      // 삭제 실패
    } finally {
      setDeleteTarget(null);
    }
  };

  // ─── 렌더링 ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">콘텐츠 관리</h2>
          <p className="text-sm text-gray-500 mt-0.5">피드에 게시할 콘텐츠를 관리하세요</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1E5FA8] text-white hover:bg-[#174d8a] transition-colors"
        >
          새 콘텐츠 등록
        </button>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-8 h-8 border-3 border-[#1E5FA8] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : contents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          등록된 콘텐츠가 없습니다. 새 콘텐츠를 등록해보세요.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">썸네일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">설명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">카테고리</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">조회수</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">등록일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contents.map((item) => {
                const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
                return (
                  <tr key={item.feed_id} className="hover:bg-gray-50">
                    {/* 썸네일 */}
                    <td className="px-4 py-3">
                      {item.photo_urls && item.photo_urls.length > 0 ? (
                        <img
                          src={item.photo_urls[0]}
                          alt="썸네일"
                          className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </td>
                    {/* 설명 */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900 truncate max-w-xs">{item.description}</p>
                    </td>
                    {/* 카테고리 */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{item.category}</span>
                    </td>
                    {/* 상태 */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.className}`}>
                        {statusStyle.label}
                      </span>
                    </td>
                    {/* 조회수 */}
                    <td className="px-4 py-3 text-sm text-gray-600">{item.view_count || 0}</td>
                    {/* 등록일 */}
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(item.created_at)}</td>
                    {/* 관리 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item.feed_id)}
                          className="px-3 py-1 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── 등록/수정 모달 ──────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {editingId ? '콘텐츠 수정' : '새 콘텐츠 등록'}
            </h3>

            <div className="space-y-4">
              {/* 이미지 업로드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사진</label>
                <ImageUploader images={images} onChange={setImages} maxImages={10} />
              </div>

              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="콘텐츠 설명을 입력하세요"
                  className="w-full h-24 px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
                />
              </div>

              {/* 비급여 가격 정보 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비급여 가격 정보</label>
                <textarea
                  value={pricingInfo}
                  onChange={(e) => setPricingInfo(e.target.value)}
                  placeholder="비급여 가격 정보를 입력하세요 (선택)"
                  className="w-full h-20 px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
                />
              </div>

              {/* 태그 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">태그</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="쉼표로 구분 (예: 눈성형, 코성형)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
                />
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !description.trim()}
                className="flex-1 py-2.5 text-sm bg-[#1E5FA8] text-white rounded-lg hover:bg-[#174d8a] transition-colors disabled:opacity-50"
              >
                {submitting ? '저장 중...' : editingId ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 삭제 확인 모달 ──────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h4 className="font-bold text-gray-900 mb-2">콘텐츠 삭제</h4>
            <p className="text-sm text-gray-600 mb-5">이 콘텐츠를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
