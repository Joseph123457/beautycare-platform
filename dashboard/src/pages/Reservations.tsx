import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import { useAuth } from '../hooks/useAuth';

// ─── 타입 정의 ─────────────────────────────────────────

interface Reservation {
  reservation_id: string;
  treatment_name: string;
  reserved_at: string;
  status: 'PENDING' | 'CONFIRMED' | 'DONE' | 'CANCELLED';
  memo: string | null;
  user_name: string;
  user_phone: string;
  hospital_id: string;
}

type TabKey = 'today' | 'all' | 'cancelled';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// ─── 상태 배지 설정 ────────────────────────────────────

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:   { label: '대기',   bg: 'bg-yellow-100', text: 'text-yellow-700' },
  CONFIRMED: { label: '확정',   bg: 'bg-blue-100',   text: 'text-blue-700' },
  DONE:      { label: '완료',   bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CANCELLED: { label: '취소',   bg: 'bg-gray-100',   text: 'text-gray-500' },
};

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
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-200 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-8 w-16 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────

/** 예약 관리 페이지 */
export default function Reservations() {
  const { user } = useAuth();
  const hospitalId = user?.hospital_id;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 취소 모달 상태
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // 토스트 추가
  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // 토스트 제거
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 예약 목록 불러오기
  const loadReservations = useCallback(async (tab: TabKey) => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (tab === 'today') {
        params.date = 'today';
      } else if (tab === 'cancelled') {
        params.status = 'CANCELLED';
      }
      const { data } = await client.get(`/hospitals/${hospitalId}/reservations`, { params });
      setReservations(data.data || []);
    } catch {
      addToast('예약 목록을 불러오지 못했습니다', 'error');
    } finally {
      setLoading(false);
    }
  }, [hospitalId, addToast]);

  // 탭 변경 시 재조회
  useEffect(() => {
    loadReservations(activeTab);
  }, [activeTab, loadReservations]);

  // 상태별 건수 계산
  const counts = {
    today: reservations.length,
    all: reservations.length,
    cancelled: reservations.filter((r) => r.status === 'CANCELLED').length,
  };

  // 상태 변경 핸들러 (확정/완료)
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await client.patch(`/reservations/${id}/status`, { status: newStatus });
      // 로컬 상태 업데이트
      setReservations((prev) =>
        prev.map((r) =>
          r.reservation_id === id ? { ...r, status: newStatus as Reservation['status'] } : r
        )
      );
      const label = newStatus === 'CONFIRMED' ? '확정' : '완료 처리';
      addToast(`예약이 ${label}되었습니다`, 'success');
    } catch {
      addToast('상태 변경에 실패했습니다', 'error');
    }
  };

  // 취소 처리
  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await client.patch(`/reservations/${cancelTarget}/status`, { status: 'CANCELLED' });
      setReservations((prev) =>
        prev.map((r) =>
          r.reservation_id === cancelTarget ? { ...r, status: 'CANCELLED' as const } : r
        )
      );
      addToast('예약이 취소되었습니다', 'success');
      setCancelTarget(null);
      setCancelReason('');
    } catch {
      addToast('예약 취소에 실패했습니다', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // 병원 ID가 없는 경우
  if (!hospitalId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        연결된 병원 정보가 없습니다. 관리자에게 문의해주세요.
      </div>
    );
  }

  // 탭 설정
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'today', label: '오늘 예약' },
    { key: 'all', label: '전체 예약' },
    { key: 'cancelled', label: '취소된 예약' },
  ];

  // 시간 포맷 헬퍼
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">예약 관리</h2>
        <p className="text-sm text-gray-500 mt-0.5">환자 예약을 확인하고 관리하세요</p>
      </div>

      {/* 탭 바 */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#1E5FA8] text-[#1E5FA8]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key
                ? 'bg-[#1E5FA8] text-white'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* 예약 카드 목록 */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {activeTab === 'today' ? '오늘 예약이 없습니다' : '예약 내역이 없습니다'}
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => {
            const status = statusConfig[r.status] || statusConfig.PENDING;
            return (
              <div
                key={r.reservation_id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* 시간 블록 */}
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-50 rounded-lg flex flex-col items-center justify-center border border-gray-100">
                    <span className="text-lg font-bold text-gray-900">{formatTime(r.reserved_at)}</span>
                    <span className="text-[10px] text-gray-400">{formatDate(r.reserved_at)}</span>
                  </div>

                  {/* 환자 정보 + 시술명 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{r.user_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{r.treatment_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.user_phone}</p>
                    {r.memo && (
                      <p className="text-xs text-gray-400 mt-1 truncate">메모: {r.memo}</p>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex-shrink-0 flex gap-1.5">
                    {/* PENDING → 확정, 취소 */}
                    {r.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(r.reservation_id, 'CONFIRMED')}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1E5FA8] text-white hover:bg-[#1a5293] transition-colors"
                        >
                          확정
                        </button>
                        <button
                          onClick={() => setCancelTarget(r.reservation_id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          취소
                        </button>
                      </>
                    )}
                    {/* CONFIRMED → 완료 처리, 취소 */}
                    {r.status === 'CONFIRMED' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(r.reservation_id, 'DONE')}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        >
                          완료 처리
                        </button>
                        <button
                          onClick={() => setCancelTarget(r.reservation_id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          취소
                        </button>
                      </>
                    )}
                    {/* DONE, CANCELLED → 액션 없음 */}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 취소 사유 모달 */}
      {cancelTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          {/* 오버레이 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { setCancelTarget(null); setCancelReason(''); }}
          />
          {/* 모달 */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 z-50">
            <h3 className="text-lg font-bold text-gray-900 mb-1">예약 취소</h3>
            <p className="text-sm text-gray-500 mb-4">취소 사유를 입력해주세요</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="취소 사유를 입력하세요 (선택)"
              className="w-full h-28 px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setCancelTarget(null); setCancelReason(''); }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelLoading ? '처리 중...' : '취소 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 알림 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
