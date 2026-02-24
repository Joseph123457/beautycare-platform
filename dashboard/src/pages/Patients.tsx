import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import { useAuth } from '../hooks/useAuth';

// ─── 타입 정의 ─────────────────────────────────────────

interface Patient {
  user_id: number;
  name: string;
  phone: string;
  email: string;
  visit_count: number;
  last_visit: string | null;
  total_spent: number;
}

interface PatientDetail {
  user_id: number;
  name: string;
  phone: string;
  email: string;
  visit_count: number;
  last_visit: string | null;
  total_spent: number;
  avg_revisit_days: number | null;
  reservations: ReservationItem[];
  reviews: ReviewItem[];
  memos: MemoItem[];
}

interface ReservationItem {
  reservation_id: number;
  treatment_name: string;
  reserved_at: string;
  status: string;
  price: number | null;
}

interface ReviewItem {
  review_id: number;
  rating: number;
  content: string;
  created_at: string;
}

interface MemoItem {
  memo_id: number;
  content: string;
  created_by: string;
  created_at: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// ─── 상수 ──────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  DONE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기', CONFIRMED: '확정', DONE: '완료', CANCELLED: '취소',
};
const TIER_LEVEL: Record<string, number> = { FREE: 0, BASIC: 1, PRO: 2 };

// ─── 헬퍼 ─────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function fmtPhone(phone: string | null) {
  if (!phone) return '-';
  const c = phone.replace(/[^\d]/g, '');
  return c.length === 11 ? `${c.slice(0, 3)}-${c.slice(3, 7)}-${c.slice(7)}` : phone;
}

function fmtMoney(n: number) { return n.toLocaleString() + '원'; }

// ─── 토스트 ───────────────────────────────────────────

function Toasts({ items, onRemove }: { items: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <div className="flex items-center justify-between gap-3">
            <span>{t.message}</span>
            <button onClick={() => onRemove(t.id)} className="opacity-70 hover:opacity-100">&#10005;</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 요약 카드 ────────────────────────────────────────

function StatCard({ icon, label, value, color = 'bg-blue-50 text-blue-600' }: {
  icon: React.ReactNode; label: string; value: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 flex-1 min-w-[180px]">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// ─── 타임라인 ─────────────────────────────────────────

function Timeline({ items }: { items: ReservationItem[] }) {
  if (!items.length) return <p className="text-sm text-gray-400 py-4 text-center">시술 이력이 없습니다</p>;
  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-200" />
      {items.map((r) => (
        <div key={r.reservation_id} className="relative">
          <div className={`absolute -left-6 top-1.5 w-[11px] h-[11px] rounded-full border-2 ${
            r.status === 'DONE' ? 'border-green-500 bg-green-500' : r.status === 'CONFIRMED' ? 'border-blue-500 bg-blue-500' : r.status === 'CANCELLED' ? 'border-gray-400 bg-gray-400' : 'border-yellow-500 bg-yellow-500'
          }`} />
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-gray-900">{r.treatment_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{fmtDate(r.reserved_at)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {r.price != null && r.price > 0 && <span className="text-xs text-gray-500">{fmtMoney(r.price)}</span>}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLOR[r.status] || ''}`}>{STATUS_LABEL[r.status] || r.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────

export default function Patients() {
  const { user } = useAuth();
  const hospitalId = user?.hospital_id;

  const [tier, setTier] = useState('FREE');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pg, setPg] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<'last_visit' | 'visit_count'>('last_visit');

  // 사이드 패널
  const [selId, setSelId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memoIn, setMemoIn] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);

  // 단체 메시지
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bTarget, setBTarget] = useState<'all' | 'treatment' | 'inactive'>('all');
  const [bTreat, setBTreat] = useState('');
  const [bMonths, setBMonths] = useState('3');
  const [bChan, setBChan] = useState<'push' | 'alimtalk'>('push');
  const [bTitle, setBTitle] = useState('');
  const [bBody, setBBody] = useState('');
  const [bSending, setBSending] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((msg: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  }, []);

  // 구독 등급
  useEffect(() => {
    (async () => {
      try { const { data } = await client.get('/subscriptions/my'); setTier(data.data?.current_tier || 'FREE'); } catch {}
    })();
  }, []);

  // 환자 목록
  const loadList = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20, sort };
      if (search) params.search = search;
      const { data } = await client.get('/patients', { params });
      setPatients(data.data?.patients || []);
      setPg(data.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch { toast('환자 목록을 불러오지 못했습니다', 'error'); }
    finally { setLoading(false); }
  }, [search, sort, toast]);

  useEffect(() => { if (hospitalId) loadList(pg.page); }, [hospitalId, search, sort]); // eslint-disable-line

  // 환자 상세
  const loadDetail = useCallback(async (uid: number) => {
    setDetailLoading(true); setDetail(null);
    try { const { data } = await client.get(`/patients/${uid}`); setDetail(data.data); }
    catch { toast('환자 정보를 불러오지 못했습니다', 'error'); }
    finally { setDetailLoading(false); }
  }, [toast]);

  useEffect(() => { if (selId) loadDetail(selId); }, [selId, loadDetail]);

  // 메모 저장
  const saveMemo = async () => {
    if (!selId || !memoIn.trim()) return;
    setMemoSaving(true);
    try {
      await client.patch(`/patients/${selId}/memo`, { content: memoIn.trim() });
      setMemoIn(''); toast('메모가 저장되었습니다', 'success'); loadDetail(selId);
    } catch { toast('메모 저장에 실패했습니다', 'error'); }
    finally { setMemoSaving(false); }
  };

  // 단체 발송
  const resetBulk = () => { setBTarget('all'); setBTreat(''); setBMonths('3'); setBChan('push'); setBTitle(''); setBBody(''); };
  const sendBulk = async () => {
    if (!bTitle.trim() || !bBody.trim()) { toast('제목과 본문을 입력해주세요', 'error'); return; }
    setBSending(true);
    try {
      const payload: Record<string, string | number> = { target: bTarget, channel: bChan, title: bTitle, body: bBody };
      if (bTarget === 'treatment') payload.treatmentName = bTreat;
      if (bTarget === 'inactive') payload.inactiveMonths = Number(bMonths);
      const { data } = await client.post('/patients/bulk-message', payload);
      toast(data.message || '발송 완료', 'success'); setBulkOpen(false); resetBulk();
    } catch (e: any) { toast(e.response?.data?.message || '발송 실패', 'error'); }
    finally { setBSending(false); }
  };

  const onSearch = (e: React.FormEvent) => { e.preventDefault(); setSearch(searchInput); setPg((p) => ({ ...p, page: 1 })); };
  const goPage = (p: number) => { setPg((prev) => ({ ...prev, page: p })); loadList(p); };

  if (!hospitalId) return <div className="flex items-center justify-center h-64 text-gray-400">연결된 병원 정보가 없습니다.</div>;

  const isFree = (TIER_LEVEL[tier] || 0) < 1;
  const isPro = (TIER_LEVEL[tier] || 0) >= 2;
  const visible = isFree ? patients.slice(0, 3) : patients;
  const blurred = isFree ? patients.slice(3) : [];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">환자 관리</h2>
          <p className="text-sm text-gray-500 mt-0.5">환자 정보를 조회하고 CRM 활동을 관리하세요</p>
        </div>
        <button onClick={() => { if (!isPro) { toast('단체 메시지는 PRO 플랜에서 사용 가능합니다', 'error'); return; } setBulkOpen(true); }}
          className="px-4 py-2 text-sm font-medium bg-[#1E5FA8] text-white rounded-lg hover:bg-[#174d8a] transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          단체 메시지
          {!isPro && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">PRO</span>}
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="flex gap-4 flex-wrap">
        <StatCard icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          label="전체 환자" value={`${pg.total}명`} color="bg-blue-50 text-blue-600" />
        <StatCard icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>}
          label="이번 달 신규" value={`${patients.filter((p) => { if (!p.last_visit) return false; const d = new Date(p.last_visit); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() && Number(p.visit_count) === 1; }).length}명`}
          color="bg-green-50 text-green-600" />
        <StatCard icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
          label="재방문율" value={patients.length > 0 ? `${Math.round((patients.filter((p) => Number(p.visit_count) >= 2).length / patients.length) * 100)}%` : '-'}
          color="bg-purple-50 text-purple-600" />
        <StatCard icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          label="평균 방문 주기" value="상세 확인" color="bg-orange-50 text-orange-600" />
      </div>

      {/* 검색 + 정렬 */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={onSearch} className="flex gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="이름 또는 연락처로 검색"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]" />
          </div>
          <button type="submit" className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">검색</button>
        </form>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]">
          <option value="last_visit">최근 방문순</option>
          <option value="visit_count">방문 횟수순</option>
        </select>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          {[1,2,3,4,5].map((i) => <div key={i} className="flex gap-4 py-3 border-b border-gray-50"><div className="h-3.5 bg-gray-200 rounded w-20" /><div className="h-3.5 bg-gray-200 rounded w-28" /><div className="h-3.5 bg-gray-200 rounded w-12" /><div className="h-3.5 bg-gray-200 rounded w-24" /></div>)}
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">{search ? `"${search}" 검색 결과가 없습니다` : '등록된 환자가 없습니다'}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left bg-gray-50/50">
                  <th className="px-5 py-3 font-medium text-gray-500">이름</th>
                  <th className="px-5 py-3 font-medium text-gray-500">연락처</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-center">방문 횟수</th>
                  <th className="px-5 py-3 font-medium text-gray-500">마지막 방문일</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-right">총 결제액</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.user_id} onClick={() => { if (isFree) { toast('BASIC 플랜 이상에서 사용 가능합니다', 'error'); return; } setSelId(p.user_id); setMemoIn(''); }}
                    className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 cursor-pointer transition-colors">
                    <td className="px-5 py-3"><div className="flex items-center gap-2.5"><div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0"><span className="text-xs font-medium text-gray-500">{p.name?.charAt(0)}</span></div><span className="font-medium text-gray-900">{p.name}</span></div></td>
                    <td className="px-5 py-3 text-gray-600">{fmtPhone(p.phone)}</td>
                    <td className="px-5 py-3 text-center"><span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">{p.visit_count}</span></td>
                    <td className="px-5 py-3 text-gray-600">{fmtDate(p.last_visit)}</td>
                    <td className="px-5 py-3 text-right text-gray-900 font-medium">{fmtMoney(Number(p.total_spent))}</td>
                    <td className="px-5 py-3 text-center"><svg className="w-4 h-4 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg></td>
                  </tr>
                ))}
                {blurred.map((p) => (
                  <tr key={p.user_id} className="border-b border-gray-50 last:border-0">
                    <td colSpan={6} className="px-5 py-3"><div className="flex items-center gap-2.5 blur-[4px] select-none pointer-events-none"><div className="w-8 h-8 bg-gray-100 rounded-full" /><span className="text-gray-400">{p.name} | {fmtPhone(p.phone)} | {p.visit_count}회</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isFree && blurred.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 text-center"><div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <span>나머지 <strong>{blurred.length}명</strong>은 BASIC 플랜 이상에서 확인 가능</span>
            </div></div>
          )}
          {!isFree && pg.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => goPage(pg.page - 1)} disabled={pg.page <= 1} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">이전</button>
              <span className="text-sm text-gray-500">{pg.page} / {pg.totalPages}</span>
              <button onClick={() => goPage(pg.page + 1)} disabled={pg.page >= pg.totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">다음</button>
            </div>
          )}
        </div>
      )}

      {/* ── 사이드 패널 ── */}
      {selId && (<>
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelId(null)} />
        <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col" style={{ animation: 'slideInRight .25s ease-out' }}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-gray-900">환자 상세</h3>
            <button onClick={() => setSelId(null)} className="p-1 rounded-lg hover:bg-gray-100"><svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {detailLoading ? (
              <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-[#1E5FA8] border-t-transparent rounded-full animate-spin" /></div>
            ) : detail ? (
              <div className="divide-y divide-gray-100">
                {/* 기본 정보 */}
                <div className="px-6 py-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center"><span className="text-lg font-bold text-blue-600">{detail.name?.charAt(0)}</span></div>
                    <div><p className="font-bold text-gray-900">{detail.name}</p><p className="text-sm text-gray-500">{fmtPhone(detail.phone)}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[['총 방문', `${detail.visit_count}회`], ['총 결제액', fmtMoney(Number(detail.total_spent))], ['마지막 방문', fmtDate(detail.last_visit)], ['재방문 주기', detail.avg_revisit_days ? `${detail.avg_revisit_days}일` : '-']].map(([l, v]) => (
                      <div key={l} className="bg-gray-50 rounded-lg px-3 py-2.5"><p className="text-[11px] text-gray-400">{l}</p><p className="text-sm font-bold text-gray-900">{v}</p></div>
                    ))}
                  </div>
                </div>
                {/* 시술 이력 */}
                <div className="px-6 py-5"><h4 className="text-sm font-bold text-gray-900 mb-3">시술 이력</h4><Timeline items={detail.reservations} /></div>
                {/* 리뷰 */}
                {detail.reviews.length > 0 && (
                  <div className="px-6 py-5"><h4 className="text-sm font-bold text-gray-900 mb-3">작성 리뷰</h4>
                    <div className="space-y-3">{detail.reviews.map((rv) => (
                      <div key={rv.review_id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex">{Array.from({ length: 5 }, (_, i) => <svg key={i} className={`w-3 h-3 ${i < rv.rating ? 'text-[#E8772E]' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}</div>
                          <span className="text-[11px] text-gray-400">{fmtDate(rv.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{rv.content}</p>
                      </div>
                    ))}</div>
                  </div>
                )}
                {/* 메모 */}
                <div className="px-6 py-5">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">내부 메모</h4>
                  <div className="mb-4">
                    <textarea value={memoIn} onChange={(e) => setMemoIn(e.target.value)} placeholder="환자에 대한 내부 메모를 입력하세요"
                      className="w-full h-20 px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]" />
                    <div className="flex justify-end mt-2">
                      <button onClick={saveMemo} disabled={memoSaving || !memoIn.trim()}
                        className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#1E5FA8] text-white hover:bg-[#174d8a] disabled:opacity-50">{memoSaving ? '저장 중...' : '메모 저장'}</button>
                    </div>
                  </div>
                  {detail.memos.length === 0 ? <p className="text-xs text-gray-400 text-center py-2">메모가 없습니다</p> : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto">{detail.memos.map((m) => (
                      <div key={m.memo_id} className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                        <p className="text-xs text-gray-700 leading-relaxed">{m.content}</p>
                        <div className="flex items-center justify-between mt-2"><span className="text-[11px] text-gray-400">{m.created_by}</span><span className="text-[11px] text-gray-400">{fmtDate(m.created_at)}</span></div>
                      </div>
                    ))}</div>
                  )}
                </div>
              </div>
            ) : <div className="flex items-center justify-center h-40 text-sm text-gray-400">정보를 불러올 수 없습니다</div>}
          </div>
          {detail && (
            <div className="px-6 py-4 border-t border-gray-200 shrink-0">
              <button onClick={() => { if (!isPro) { toast('PRO 플랜에서 사용 가능합니다', 'error'); return; } setSelId(null); setBulkOpen(true); }}
                className="w-full py-2.5 text-sm font-medium bg-[#E8772E] text-white rounded-lg hover:bg-[#d16a28] flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                메시지 보내기
              </button>
            </div>
          )}
        </div>
      </>)}

      {/* ── 단체 메시지 모달 ── */}
      {bulkOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">단체 메시지 발송<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">PRO</span></h3>
              <button onClick={() => { setBulkOpen(false); resetBulk(); }} className="p-1 rounded-lg hover:bg-gray-100"><svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">발송 대상</label>
              <div className="flex gap-2 flex-wrap">
                {([['all','전체 환자'],['treatment','특정 시술'],['inactive','미방문 환자']] as const).map(([v,l]) => (
                  <button key={v} onClick={() => setBTarget(v)} className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${bTarget === v ? 'border-[#1E5FA8] bg-[#1E5FA8]/5 text-[#1E5FA8] font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
                ))}
              </div>
              {bTarget === 'treatment' && <input type="text" value={bTreat} onChange={(e) => setBTreat(e.target.value)} placeholder="시술명 (예: 보톡스)" className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]" />}
              {bTarget === 'inactive' && <div className="mt-2 flex items-center gap-2"><input type="number" value={bMonths} onChange={(e) => setBMonths(e.target.value)} min="1" max="24" className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]" /><span className="text-sm text-gray-600">개월 이상 미방문</span></div>}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">발송 채널</label>
              <div className="flex gap-2">
                {([['push','푸시 알림'],['alimtalk','카카오 알림톡']] as const).map(([v,l]) => (
                  <button key={v} onClick={() => setBChan(v)} className={`flex-1 px-3 py-2.5 text-sm rounded-lg border transition-colors ${bChan === v ? 'border-[#1E5FA8] bg-[#1E5FA8]/5 text-[#1E5FA8] font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-2">메시지 제목</label><input type="text" value={bTitle} onChange={(e) => setBTitle(e.target.value)} placeholder="메시지 제목" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]" /></div>
            <div className="mb-5"><label className="block text-sm font-medium text-gray-700 mb-2">메시지 본문</label><textarea value={bBody} onChange={(e) => setBBody(e.target.value)} placeholder="메시지 본문" rows={4} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]" /></div>
            <div className="flex gap-2">
              <button onClick={() => { setBulkOpen(false); resetBulk(); }} className="flex-1 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={sendBulk} disabled={bSending} className="flex-1 py-2.5 text-sm bg-[#1E5FA8] text-white rounded-lg hover:bg-[#174d8a] disabled:opacity-50">{bSending ? '발송 중...' : '발송하기'}</button>
            </div>
          </div>
        </div>
      )}

      <Toasts items={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}
