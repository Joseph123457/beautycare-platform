import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import client from '../api/client';
import { useAuth } from '../hooks/useAuth';
import StatCard from '../components/StatCard';

// ─── 타입 정의 ───────────────────────────────────────

type Period = '7d' | '30d' | '90d' | '1y';

interface OverviewData {
  period: string;
  days: number;
  reservationTrend: { date: string; count: number }[];
  summary: {
    total: number;
    completed: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    completionRate: number;
  };
  revenue: {
    total: number;
    paymentCount: number;
    monthly: { month: string; revenue: number; count: number }[];
  };
  patientRatio: {
    total: number;
    new: number;
    returning: number;
    newRate: number;
  };
  ratingTrend: { month: string; avgRating: number; reviewCount: number }[];
}

interface TreatmentsData {
  ranking: {
    treatmentName: string;
    totalCount: number;
    completedCount: number;
    cancelledCount: number;
  }[];
  ratings: { treatmentName: string; avgRating: number; reviewCount: number }[];
  rebookingRate: {
    treatmentName: string;
    totalUsers: number;
    repeatUsers: number;
    rate: number;
  }[];
}

interface TimeData {
  byDayOfWeek: { day: number; dayName: string; count: number }[];
  byHour: { hour: number; count: number }[];
  byTimeSlot: { name: string; label: string; count: number }[];
  peakRecommendation: {
    peakHours: string[];
    peakDays: string[];
    busiestSlot: string | null;
    message: string;
  };
}

interface ExposureData {
  algorithmScore: {
    total: number;
    breakdown: Record<string, { score: number; weight: number; label: string }>;
  };
  competitivePosition: {
    category: string;
    totalInCategory: number;
    myPercentile: number;
    topPercent: number;
    categoryAvg: { avgRating: number; avgReviews: number; avgResponseRate: number };
    myStats: { avgRating: number; reviewCount: number; responseRate: number };
  };
  conversionFunnel: {
    reservations: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    confirmRate: number;
    completionRate: number;
  };
}

// ─── 기간 탭 옵션 ─────────────────────────────────────
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: '90d', label: '90일' },
  { value: '1y', label: '1년' },
];

// ─── 히트맵 색상 ──────────────────────────────────────
const getHeatColor = (value: number, max: number) => {
  if (max === 0) return 'bg-gray-50';
  const ratio = value / max;
  if (ratio >= 0.8) return 'bg-[#1E5FA8] text-white';
  if (ratio >= 0.6) return 'bg-[#1E5FA8]/70 text-white';
  if (ratio >= 0.4) return 'bg-[#1E5FA8]/40 text-white';
  if (ratio >= 0.2) return 'bg-[#1E5FA8]/20 text-gray-700';
  if (value > 0) return 'bg-[#1E5FA8]/10 text-gray-600';
  return 'bg-gray-50 text-gray-300';
};

// ─── 점수 게이지 색상 ─────────────────────────────────
const getScoreColor = (score: number) => {
  if (score >= 80) return '#10B981'; // 녹색
  if (score >= 60) return '#1E5FA8'; // 파랑
  if (score >= 40) return '#E8772E'; // 주황
  return '#EF4444'; // 빨강
};

// ─── 스켈레톤 컴포넌트 ───────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <Skeleton className="w-11 h-11 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <Skeleton className="h-5 w-40 mb-4" />
      <Skeleton className={`${height} w-full`} />
    </div>
  );
}

// ─── 알고리즘 점수 게이지 컴포넌트 ───────────────────
function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* 배경 원 */}
        <circle cx="60" cy="60" r="45" fill="none" stroke="#f3f4f6" strokeWidth="10" />
        {/* 점수 원 */}
        <circle
          cx="60" cy="60" r="45" fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          className="transition-all duration-700"
        />
        {/* 점수 텍스트 */}
        <text x="60" y="55" textAnchor="middle" className="text-2xl font-bold" fill={color} fontSize="28">
          {score}
        </text>
        <text x="60" y="75" textAnchor="middle" fill="#9CA3AF" fontSize="11">
          / 100
        </text>
      </svg>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );
}

// ─── 점수 항목별 바 컴포넌트 ──────────────────────────
function ScoreBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  const color = getScoreColor(score);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label} <span className="text-gray-400">({weight}%)</span></span>
        <span className="font-semibold" style={{ color }}>{score}점</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── 개선 팁 데이터 ───────────────────────────────────
const SCORE_TIPS: Record<string, string> = {
  profile: '병원 소개, 진료과목, 사진 등 프로필을 빠짐없이 채워주세요',
  rating: '환자 후기에 정성껏 답변하면 평점이 자연스럽게 올라갑니다',
  reviews: '시술 후 리뷰 작성을 안내하면 리뷰 수가 늘어납니다',
  responseRate: '예약 문의에 빠르게 응답하면 응답률이 높아집니다',
};

// ═══════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════

/** 통계 분석 페이지 */
export default function Analytics() {
  const { user } = useAuth();
  const hospitalId = user?.hospital_id;

  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [treatments, setTreatments] = useState<TreatmentsData | null>(null);
  const [timeData, setTimeData] = useState<TimeData | null>(null);
  const [exposure, setExposure] = useState<ExposureData | null>(null);

  // ── 데이터 로드 ──
  const loadAnalytics = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const [ovRes, trRes, tmRes, exRes] = await Promise.all([
        client.get(`/analytics/overview/${hospitalId}`, { params: { period } }),
        client.get(`/analytics/treatments/${hospitalId}`, { params: { period } }),
        client.get(`/analytics/time/${hospitalId}`, { params: { period } }),
        client.get(`/analytics/exposure/${hospitalId}`),
      ]);
      setOverview(ovRes.data.data);
      setTreatments(trRes.data.data);
      setTimeData(tmRes.data.data);
      setExposure(exRes.data.data);
    } catch {
      // API 에러 시 기본값 유지
    } finally {
      setLoading(false);
    }
  }, [hospitalId, period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // 병원 미연결 상태
  if (!hospitalId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        연결된 병원 정보가 없습니다.
      </div>
    );
  }

  // ── 히트맵 데이터 생성 (시간 × 요일) ──
  const heatmapData: { hour: number; counts: number[] }[] = [];
  if (timeData) {
    // 시간대 라벨용 시간 목록 (9~21시)
    for (let h = 9; h <= 21; h++) {
      const hourEntry = timeData.byHour.find((x) => x.hour === h);
      // 요일별 분포가 없으므로 시간별 데이터를 요일 비율로 분배
      const totalDayCount = timeData.byDayOfWeek.reduce((s, d) => s + d.count, 0) || 1;
      const counts = timeData.byDayOfWeek.map((d) => {
        const dayRatio = d.count / totalDayCount;
        return Math.round((hourEntry?.count || 0) * dayRatio);
      });
      heatmapData.push({ hour: h, counts });
    }
  }
  const heatmapMax = Math.max(1, ...heatmapData.flatMap((r) => r.counts));

  return (
    <div className="space-y-6">
      {/* ── 헤더 + 기간 선택 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">통계 분석</h2>
          <p className="text-sm text-gray-500 mt-0.5">병원 운영 데이터를 한눈에 분석하세요</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === opt.value
                  ? 'bg-white text-[#1E5FA8] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 1. 핵심 지표 카드 4개 ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="총 예약"
            value={overview?.summary.total ?? 0}
            subtitle={`완료 ${overview?.summary.completed ?? 0}건`}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard
            title="예약 완료율"
            value={`${overview?.summary.completionRate ?? 0}%`}
            subtitle="예약 → 완료 전환"
            color="orange"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <StatCard
            title="평균 평점"
            value={overview?.ratingTrend.length
              ? overview.ratingTrend[overview.ratingTrend.length - 1].avgRating.toFixed(1)
              : '0.0'}
            subtitle="/ 5.0"
            color="green"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
          />
          <StatCard
            title="노출 점수"
            value={exposure?.algorithmScore.total ?? 0}
            subtitle={exposure ? `상위 ${exposure.competitivePosition.topPercent}%` : ''}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        </div>
      )}

      {/* ── 2. 예약 추이 & 매출 추이 (이중 그래프) ── */}
      {loading ? (
        <ChartSkeleton />
      ) : overview && overview.reservationTrend.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-5">예약 수 추이</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={overview.reservationTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                width={35}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                labelFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
                }}
                formatter={(value: number) => [`${value}건`, '예약 수']}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#1E5FA8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#1E5FA8', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 5 }}
                name="예약 수"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">예약 수 추이</h3>
          <p className="text-sm text-gray-400">해당 기간에 예약 데이터가 없습니다</p>
        </div>
      )}

      {/* ── 중간 2열: 매출 추이 + 환자 비율 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 매출 추이 */}
        {loading ? (
          <ChartSkeleton height="h-48" />
        ) : overview && overview.revenue.monthly.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-900">월별 매출</h3>
              <span className="text-lg font-bold text-[#1E5FA8]">
                {overview.revenue.total.toLocaleString()}원
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={overview.revenue.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => v.slice(5)} // "2026-01" → "01"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(value: number) => [`${value.toLocaleString()}원`, '매출']}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {overview.revenue.monthly.map((_, idx) => (
                    <Cell key={idx} fill={idx === overview.revenue.monthly.length - 1 ? '#1E5FA8' : '#1E5FA8aa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">월별 매출</h3>
            <p className="text-sm text-gray-400">결제 데이터가 없습니다</p>
          </div>
        )}

        {/* 환자 비율 */}
        {loading ? (
          <ChartSkeleton height="h-48" />
        ) : overview ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-5">환자 구성</h3>
            <div className="flex items-center gap-6">
              {/* 도넛 대체: 큰 숫자 */}
              <div className="flex flex-col items-center min-w-[100px]">
                <span className="text-3xl font-bold text-gray-900">{overview.patientRatio.total}</span>
                <span className="text-xs text-gray-400 mt-1">총 환자</span>
              </div>
              <div className="flex-1 space-y-4">
                {/* 신규 환자 바 */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#1E5FA8] font-medium">신규 환자</span>
                    <span className="text-gray-600">{overview.patientRatio.new}명 ({overview.patientRatio.newRate}%)</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1E5FA8] rounded-full transition-all duration-500"
                      style={{ width: `${overview.patientRatio.newRate}%` }}
                    />
                  </div>
                </div>
                {/* 재방문 환자 바 */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#E8772E] font-medium">재방문 환자</span>
                    <span className="text-gray-600">
                      {overview.patientRatio.returning}명 ({overview.patientRatio.total > 0 ? 100 - overview.patientRatio.newRate : 0}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E8772E] rounded-full transition-all duration-500"
                      style={{ width: `${overview.patientRatio.total > 0 ? 100 - overview.patientRatio.newRate : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* 평점 추이 미니 라인 */}
            {overview.ratingTrend.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">월별 평균 평점</p>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={overview.ratingTrend}>
                    <XAxis dataKey="month" hide />
                    <YAxis domain={[0, 5]} hide />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '11px' }}
                      formatter={(v: number) => [`${v}점`, '평점']}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgRating"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#10B981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ── 3. 시술별 인기도 바 차트 ── */}
      {loading ? (
        <ChartSkeleton />
      ) : treatments && treatments.ranking.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-5">시술별 인기도</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 왼쪽: 바 차트 */}
            <ResponsiveContainer width="100%" height={Math.max(200, treatments.ranking.length * 44)}>
              <BarChart
                data={treatments.ranking}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="treatmentName"
                  tick={{ fontSize: 12, fill: '#374151' }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(value: number) => [`${value}건`, '예약 수']}
                />
                <Bar dataKey="totalCount" radius={[0, 4, 4, 0]}>
                  {treatments.ranking.map((_, idx) => (
                    <Cell key={idx} fill={idx === 0 ? '#1E5FA8' : idx === 1 ? '#1E5FA8cc' : '#1E5FA8aa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* 오른쪽: 시술별 상세 (평점 + 재예약율) */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-medium">시술별 성과</p>
              {treatments.ranking.map((t) => {
                const rating = treatments.ratings.find((r) => r.treatmentName === t.treatmentName);
                const rebook = treatments.rebookingRate.find((r) => r.treatmentName === t.treatmentName);
                return (
                  <div key={t.treatmentName} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700 font-medium truncate max-w-[140px]">{t.treatmentName}</span>
                    <div className="flex items-center gap-4 text-xs">
                      {rating && (
                        <span className="text-yellow-500">
                          {'★'} {rating.avgRating.toFixed(1)}
                          <span className="text-gray-400 ml-0.5">({rating.reviewCount})</span>
                        </span>
                      )}
                      {rebook && (
                        <span className="text-[#1E5FA8]">
                          재예약 {rebook.rate}%
                        </span>
                      )}
                      <span className="text-gray-400">
                        {t.completedCount}/{t.totalCount}건
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">시술별 인기도</h3>
          <p className="text-sm text-gray-400">시술 데이터가 없습니다</p>
        </div>
      )}

      {/* ── 4. 요일/시간대 히트맵 ── */}
      {loading ? (
        <ChartSkeleton />
      ) : timeData ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-900">요일 · 시간대별 예약 분포</h3>
            {timeData.peakRecommendation.message && (
              <span className="text-xs text-[#1E5FA8] bg-[#1E5FA8]/5 px-3 py-1 rounded-full">
                {timeData.peakRecommendation.message}
              </span>
            )}
          </div>

          {/* 히트맵 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr>
                  <th className="text-xs text-gray-400 font-normal pb-2 text-left w-16">시간</th>
                  {timeData.byDayOfWeek.map((d) => (
                    <th key={d.day} className="text-xs text-gray-400 font-normal pb-2 text-center">
                      {d.dayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row) => (
                  <tr key={row.hour}>
                    <td className="text-xs text-gray-500 py-0.5 pr-2">{row.hour}시</td>
                    {row.counts.map((count, dayIdx) => (
                      <td key={dayIdx} className="p-0.5 text-center">
                        <div
                          className={`w-full h-7 rounded flex items-center justify-center text-[10px] font-medium ${getHeatColor(count, heatmapMax)}`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 시간대별 요약 */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
            {timeData.byTimeSlot.map((slot) => (
              <div
                key={slot.name}
                className="flex-1 bg-gray-50 rounded-lg p-3 text-center"
              >
                <p className="text-xs text-gray-400">{slot.name}</p>
                <p className="text-sm font-bold text-gray-900 mt-1">{slot.count}건</p>
                <p className="text-[10px] text-gray-400">{slot.label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── 5. 노출 알고리즘 점수 미터 ── */}
      {loading ? (
        <ChartSkeleton />
      ) : exposure ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-5">노출 알고리즘 분석</h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 왼쪽: 게이지 + 순위 */}
            <div className="flex flex-col items-center justify-center">
              <ScoreGauge score={exposure.algorithmScore.total} label="종합 노출 점수" />
              <div className="mt-4 text-center">
                <p className="text-sm font-semibold text-gray-900">
                  {exposure.competitivePosition.category} 카테고리
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {exposure.competitivePosition.totalInCategory}개 병원 중{' '}
                  <span className="text-[#1E5FA8] font-bold">상위 {exposure.competitivePosition.topPercent}%</span>
                </p>
              </div>
            </div>

            {/* 중간: 항목별 점수 */}
            <div className="space-y-4">
              <p className="text-xs text-gray-500 font-medium">항목별 점수</p>
              {Object.entries(exposure.algorithmScore.breakdown).map(([key, item]) => (
                <ScoreBar key={key} label={item.label} score={item.score} weight={item.weight} />
              ))}
            </div>

            {/* 오른쪽: 카테고리 비교 + 팁 */}
            <div className="space-y-4">
              {/* 카테고리 평균 비교 */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-3">카테고리 평균 비교</p>
                <div className="space-y-2">
                  {[
                    {
                      label: '평균 평점',
                      my: exposure.competitivePosition.myStats.avgRating.toFixed(1),
                      avg: exposure.competitivePosition.categoryAvg.avgRating.toFixed(1),
                      better: exposure.competitivePosition.myStats.avgRating >= exposure.competitivePosition.categoryAvg.avgRating,
                    },
                    {
                      label: '리뷰 수',
                      my: `${exposure.competitivePosition.myStats.reviewCount}개`,
                      avg: `${exposure.competitivePosition.categoryAvg.avgReviews}개`,
                      better: exposure.competitivePosition.myStats.reviewCount >= exposure.competitivePosition.categoryAvg.avgReviews,
                    },
                    {
                      label: '응답률',
                      my: `${exposure.competitivePosition.myStats.responseRate}%`,
                      avg: `${exposure.competitivePosition.categoryAvg.avgResponseRate}%`,
                      better: exposure.competitivePosition.myStats.responseRate >= exposure.competitivePosition.categoryAvg.avgResponseRate,
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${item.better ? 'text-emerald-600' : 'text-red-500'}`}>
                          {item.my}
                        </span>
                        <span className="text-gray-300">vs</span>
                        <span className="text-gray-400">{item.avg}</span>
                        <span className="text-[10px]">{item.better ? '▲' : '▼'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 개선 팁 */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">점수 올리는 팁</p>
                {Object.entries(exposure.algorithmScore.breakdown)
                  .sort((a, b) => a[1].score - b[1].score)
                  .slice(0, 2)
                  .map(([key, item]) => (
                    <div key={key} className="flex items-start gap-2 py-1.5">
                      <span className="text-[#E8772E] text-xs mt-0.5">💡</span>
                      <div>
                        <span className="text-xs font-medium text-gray-700">{item.label}</span>
                        <p className="text-[11px] text-gray-400 mt-0.5">{SCORE_TIPS[key]}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* 전환 퍼널 */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-3">최근 30일 전환 퍼널</p>
            <div className="flex items-center gap-2">
              {[
                { label: '예약', value: exposure.conversionFunnel.reservations, color: 'bg-[#1E5FA8]' },
                { label: '확정', value: exposure.conversionFunnel.confirmed, color: 'bg-[#1E5FA8]/80' },
                { label: '완료', value: exposure.conversionFunnel.completed, color: 'bg-emerald-500' },
                { label: '취소', value: exposure.conversionFunnel.cancelled, color: 'bg-red-400' },
              ].map((step, idx) => {
                const maxVal = Math.max(exposure.conversionFunnel.reservations, 1);
                const width = Math.max(15, (step.value / maxVal) * 100);
                return (
                  <div key={step.label} className="flex-1" style={{ flex: `0 0 ${width}%`, maxWidth: '100%' }}>
                    <div className={`${step.color} rounded-lg py-3 px-3 text-center ${idx < 2 ? 'text-white' : idx === 2 ? 'text-white' : 'text-white'}`}>
                      <p className="text-lg font-bold">{step.value}</p>
                      <p className="text-[10px] opacity-80">{step.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400 px-1">
              <span>확정률 {exposure.conversionFunnel.confirmRate}%</span>
              <span>완료율 {exposure.conversionFunnel.completionRate}%</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
