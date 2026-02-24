/**
 * AI 인사이트 카드 — 월간 리포트 표시 (강점/개선점/AI 조언)
 */

interface MonthlyReport {
  year: number;
  month: number;
  strengths: string[];
  improvements: string[];
  advice: string;
  sentiment_score: number;
}

interface AIInsightCardProps {
  report: MonthlyReport | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function AIInsightCard({ report, loading, error, onRefresh }: AIInsightCardProps) {
  // 로딩 상태
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">AI 인사이트</h3>
          <button
            onClick={onRefresh}
            className="text-xs text-[#1E5FA8] hover:underline"
          >
            다시 시도
          </button>
        </div>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  // 데이터 없음
  if (!report) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">AI 인사이트</h3>
          <button
            onClick={onRefresh}
            className="text-xs text-[#1E5FA8] hover:underline"
          >
            분석 요청
          </button>
        </div>
        <p className="text-sm text-gray-400">분석할 리뷰 데이터가 부족합니다</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900">AI 인사이트</h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
            {report.year}.{String(report.month).padStart(2, '0')}
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          title="새로고침"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* 강점 3가지 */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">강점</p>
        <ul className="space-y-1.5">
          {report.strengths.slice(0, 3).map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* 개선점 3가지 */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">개선점</p>
        <ul className="space-y-1.5">
          {report.improvements.slice(0, 3).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <svg className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* AI 조언 */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <p className="text-xs font-semibold text-blue-700 mb-1.5">AI 조언</p>
        <p className="text-sm text-blue-800 leading-relaxed">{report.advice}</p>
      </div>
    </div>
  );
}
