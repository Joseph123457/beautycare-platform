/**
 * 키워드 태그 클라우드 — 감성별 색상 + 클릭 필터링
 */

interface Keyword {
  keyword: string;
  count: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface KeywordCloudProps {
  keywords: Keyword[];
  loading: boolean;
  activeKeyword: string | null;
  onKeywordClick: (keyword: string | null) => void;
}

// 감성별 태그 색상
const SENTIMENT_STYLES: Record<string, { base: string; active: string }> = {
  positive: {
    base: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    active: 'bg-blue-600 text-white border-blue-600',
  },
  negative: {
    base: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    active: 'bg-red-600 text-white border-red-600',
  },
  neutral: {
    base: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
    active: 'bg-gray-600 text-white border-gray-600',
  },
};

// count 기반 크기 클래스 (small/medium/large)
function getSizeClass(count: number, maxCount: number): string {
  const ratio = count / maxCount;
  if (ratio >= 0.66) return 'text-sm px-3 py-1.5';
  if (ratio >= 0.33) return 'text-xs px-2.5 py-1';
  return 'text-[11px] px-2 py-0.5';
}

export function KeywordCloud({ keywords, loading, activeKeyword, onKeywordClick }: KeywordCloudProps) {
  // 로딩 상태
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-7 bg-gray-200 rounded-full" style={{ width: `${60 + i * 12}px` }} />
          ))}
        </div>
      </div>
    );
  }

  // 데이터 없음
  if (keywords.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3">AI 키워드 분석</h3>
        <p className="text-sm text-gray-400">키워드 데이터가 부족합니다</p>
      </div>
    );
  }

  const maxCount = Math.max(...keywords.map((k) => k.count));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">AI 키워드 분석</h3>
        {activeKeyword && (
          <button
            onClick={() => onKeywordClick(null)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            필터 해제
          </button>
        )}
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> 긍정
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-2 h-2 rounded-full bg-red-500" /> 부정
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-2 h-2 rounded-full bg-gray-400" /> 중립
        </span>
      </div>

      {/* 태그 클라우드 */}
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw) => {
          const isActive = activeKeyword === kw.keyword;
          const style = SENTIMENT_STYLES[kw.sentiment] || SENTIMENT_STYLES.neutral;
          const sizeClass = getSizeClass(kw.count, maxCount);

          return (
            <button
              key={kw.keyword}
              onClick={() => onKeywordClick(isActive ? null : kw.keyword)}
              className={`rounded-full border font-medium transition-all ${sizeClass} ${
                isActive ? style.active : style.base
              }`}
            >
              {kw.keyword}
              <span className="ml-1 opacity-70">{kw.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
