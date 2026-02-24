import { useEffect, useState, useCallback, useMemo } from 'react';
import client from '../api/client';
import { useAuth } from '../hooks/useAuth';

// ─── 타입 정의 ─────────────────────────────────────────

interface Review {
  review_id: string;
  rating: number;
  content: string;
  photo_urls: string[];
  helpful_count: number;
  is_approved: boolean;
  created_at: string;
  author_name: string;
  reply_content: string | null;
  replied_at: string | null;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// ─── 한국어 불용어 (키워드 추출에서 제외) ─────────────

const STOP_WORDS = new Set([
  '그', '이', '저', '것', '수', '등', '때', '곳', '더', '좀', '잘', '안',
  '못', '또', '다', '에', '의', '를', '을', '은', '는', '가', '이', '와',
  '과', '도', '로', '에서', '까지', '부터', '한', '할', '하고', '하는',
  '있는', '없는', '했는데', '되는', '되고', '해서', '하면', '너무', '정말',
  '진짜', '아주', '매우', '많이', '조금', '같은', '같아요', '있어요', '없어요',
  '했어요', '했습니다', '합니다', '입니다', '습니다', '이요', '에요', '아요',
  '해요', '네요', '어요', '구요', '인데', '는데', '지만', '그래서', '그리고',
  '하지만', '그런데', '그래도',
]);

// ─── 토스트 컴포넌트 ──────────────────────────────────

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{t.message}</span>
            <button onClick={() => onRemove(t.id)} className="opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 스켈레톤 카드 ────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-gray-200 rounded-full" />
        <div className="space-y-1.5">
          <div className="h-3.5 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-200 rounded w-32" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  );
}

// ─── 별점 렌더링 헬퍼 ─────────────────────────────────

function Stars({ rating, size = 'w-4 h-4' }: { rating: number; size?: string }) {
  return (
    <div className="flex">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`${size} ${i < rating ? 'text-[#E8772E]' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ─── 별점 분포 차트 ───────────────────────────────────

function RatingChart({ reviews }: { reviews: Review[] }) {
  // 1~5점 각 건수 집계
  const dist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // index 0 = 1점
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++;
    });
    return counts;
  }, [reviews]);

  const maxCount = Math.max(...dist, 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4">별점 분포</h3>
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = dist[star - 1];
          const pct = (count / maxCount) * 100;
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-8 text-right">{star}점</span>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E8772E] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8">{count}개</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 키워드 요약 ──────────────────────────────────────

function KeywordSummary({ reviews }: { reviews: Review[] }) {
  const keywords = useMemo(() => {
    const freq: Record<string, number> = {};

    reviews.forEach((r) => {
      // 한글 2글자 이상 단어 추출
      const words = r.content.match(/[가-힣]{2,}/g) || [];
      words.forEach((w) => {
        if (!STOP_WORDS.has(w) && w.length >= 2) {
          freq[w] = (freq[w] || 0) + 1;
        }
      });
    });

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [reviews]);

  if (keywords.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">키워드 요약</h3>
        <p className="text-sm text-gray-400">리뷰 데이터가 부족합니다</p>
      </div>
    );
  }

  const maxFreq = keywords[0][1];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4">키워드 요약 Top 5</h3>
      <div className="space-y-2.5">
        {keywords.map(([word, count], idx) => (
          <div key={word} className="flex items-center gap-2.5">
            <span className={`text-xs font-bold w-5 text-center ${
              idx === 0 ? 'text-[#E8772E]' : 'text-gray-400'
            }`}>
              {idx + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-gray-800">{word}</span>
                <span className="text-xs text-gray-400">{count}회</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1E5FA8] rounded-full transition-all duration-500"
                  style={{ width: `${(count / maxFreq) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 날짜 포맷 헬퍼 ──────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ─── 메인 컴포넌트 ────────────────────────────────────

/** 리뷰 관리 페이지 */
export default function Reviews() {
  const { user } = useAuth();
  const hospitalId = user?.hospital_id;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 답변 작성 상태: { [review_id]: 열림 여부 }
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});

  // 토스트
  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 리뷰 목록 불러오기
  const loadReviews = useCallback(async (p: number) => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const { data } = await client.get(
        `/hospitals/${hospitalId}/reviews/dashboard`,
        { params: { page: p } }
      );
      setReviews(data.data || []);
    } catch {
      addToast('리뷰 목록을 불러오지 못했습니다', 'error');
    } finally {
      setLoading(false);
    }
  }, [hospitalId, addToast]);

  useEffect(() => {
    loadReviews(page);
  }, [page, loadReviews]);

  // 통계 계산
  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
      : '-';
    const pendingCount = reviews.filter((r) => !r.is_approved).length;
    return { total, avg, pendingCount };
  }, [reviews]);

  // 승인 처리
  const handleApprove = async (reviewId: string) => {
    try {
      await client.patch(`/reviews/${reviewId}/approve`);
      setReviews((prev) =>
        prev.map((r) =>
          r.review_id === reviewId ? { ...r, is_approved: true } : r
        )
      );
      addToast('리뷰가 승인되었습니다', 'success');
    } catch {
      addToast('리뷰 승인에 실패했습니다', 'error');
    }
  };

  // 답변 토글
  const toggleReply = (reviewId: string) => {
    setReplyOpen((prev) => ({ ...prev, [reviewId]: !prev[reviewId] }));
  };

  // 답변 저장
  const handleReply = async (reviewId: string) => {
    const content = replyText[reviewId]?.trim();
    if (!content) return;

    setReplyLoading((prev) => ({ ...prev, [reviewId]: true }));
    try {
      await client.post(`/reviews/${reviewId}/reply`, { content });
      setReviews((prev) =>
        prev.map((r) =>
          r.review_id === reviewId
            ? { ...r, reply_content: content, replied_at: new Date().toISOString() }
            : r
        )
      );
      setReplyOpen((prev) => ({ ...prev, [reviewId]: false }));
      setReplyText((prev) => ({ ...prev, [reviewId]: '' }));
      addToast('답변이 등록되었습니다', 'success');
    } catch {
      addToast('답변 등록에 실패했습니다', 'error');
    } finally {
      setReplyLoading((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  // 병원 미연결
  if (!hospitalId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        연결된 병원 정보가 없습니다. 관리자에게 문의해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">리뷰 관리</h2>
        <p className="text-sm text-gray-500 mt-0.5">환자 리뷰를 확인하고 관리하세요</p>
      </div>

      {/* 통계 요약 카드 */}
      <div className="flex gap-4 flex-wrap">
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-3">
          <span className="text-sm text-gray-500">전체 리뷰</span>
          <span className="ml-2 font-bold text-gray-900">{stats.total}개</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-3">
          <span className="text-sm text-gray-500">평균 평점</span>
          <span className="ml-2 font-bold text-[#E8772E]">{stats.avg}</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-3">
          <span className="text-sm text-gray-500">승인 대기</span>
          <span className={`ml-2 font-bold ${stats.pendingCount > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
            {stats.pendingCount}개
          </span>
        </div>
      </div>

      {/* 별점 분포 + 키워드 요약 */}
      {!loading && reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RatingChart reviews={reviews} />
          <KeywordSummary reviews={reviews} />
        </div>
      )}

      {/* 리뷰 목록 */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          리뷰가 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.review_id}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              {/* 헤더: 작성자 + 별점 + 날짜 + 승인 상태 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-500">
                      {review.author_name?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{review.author_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Stars rating={review.rating} />
                      <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* 승인 배지 */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      review.is_approved
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {review.is_approved ? '공개' : '승인 대기'}
                  </span>

                  {/* 승인 버튼 (미승인 리뷰만) */}
                  {!review.is_approved && (
                    <button
                      onClick={() => handleApprove(review.review_id)}
                      className="px-3 py-1 text-xs font-medium rounded-lg bg-[#1E5FA8] text-white hover:bg-[#1a5293] transition-colors"
                    >
                      승인
                    </button>
                  )}
                </div>
              </div>

              {/* 리뷰 내용 */}
              <p className="text-sm text-gray-700 leading-relaxed">{review.content}</p>

              {/* 사진 */}
              {review.photo_urls && review.photo_urls.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {review.photo_urls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`리뷰 사진 ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                  ))}
                </div>
              )}

              {/* 하단: 도움이 돼요 + 답변 버튼 */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  도움돼요 {review.helpful_count}
                </span>

                <button
                  onClick={() => toggleReply(review.review_id)}
                  className="text-xs font-medium text-[#1E5FA8] hover:underline"
                >
                  {review.reply_content ? '답변 수정' : '답변 작성'}
                </button>
              </div>

              {/* 기존 답변 표시 */}
              {review.reply_content && !replyOpen[review.review_id] && (
                <div className="mt-3 ml-6 pl-4 border-l-2 border-[#1E5FA8]/20">
                  <p className="text-xs font-medium text-[#1E5FA8] mb-1">
                    병원 답변
                    {review.replied_at && (
                      <span className="text-gray-400 font-normal ml-2">{formatDate(review.replied_at)}</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">{review.reply_content}</p>
                </div>
              )}

              {/* 답변 입력 (펼침) */}
              {replyOpen[review.review_id] && (
                <div className="mt-3 ml-6 pl-4 border-l-2 border-[#1E5FA8]/20 space-y-2">
                  <textarea
                    value={replyText[review.review_id] ?? review.reply_content ?? ''}
                    onChange={(e) =>
                      setReplyText((prev) => ({ ...prev, [review.review_id]: e.target.value }))
                    }
                    placeholder="환자에게 공개되는 답변을 입력하세요"
                    className="w-full h-24 px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setReplyOpen((prev) => ({ ...prev, [review.review_id]: false }));
                        setReplyText((prev) => ({ ...prev, [review.review_id]: '' }));
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => handleReply(review.review_id)}
                      disabled={replyLoading[review.review_id]}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1E5FA8] text-white hover:bg-[#1a5293] transition-colors disabled:opacity-50"
                    >
                      {replyLoading[review.review_id] ? '저장 중...' : '답변 저장'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {!loading && reviews.length > 0 && (
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
            disabled={reviews.length < 50}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}

      {/* 토스트 알림 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
