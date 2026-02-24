import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

/**
 * 감성 분석 차트 — 3개월 추이 선그래프 + 감성 비율 도넛차트
 */

interface SentimentTrend {
  label: string;       // "2026.01" 형태
  score: number;       // 0~100 감성 점수
}

interface SentimentRatio {
  positive: number;
  neutral: number;
  negative: number;
}

interface SentimentChartProps {
  trends: SentimentTrend[];
  ratio: SentimentRatio | null;
  loading: boolean;
}

// 도넛차트 색상
const PIE_COLORS = ['#3B82F6', '#9CA3AF', '#EF4444']; // 긍정(파랑), 중립(회색), 부정(빨강)

export function SentimentChart({ trends, ratio, loading }: SentimentChartProps) {
  // 로딩 상태
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-48 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  // 데이터 없음
  if (trends.length === 0 && !ratio) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3">감성 분석 추이</h3>
        <p className="text-sm text-gray-400">분석 데이터가 부족합니다</p>
      </div>
    );
  }

  // 도넛차트 데이터
  const pieData = ratio
    ? [
        { name: '긍정', value: ratio.positive },
        { name: '중립', value: ratio.neutral },
        { name: '부정', value: ratio.negative },
      ]
    : [];

  const total = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-bold text-gray-900 mb-5">감성 분석 추이</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 왼쪽: 선 그래프 (3개월 감성 점수) */}
        {trends.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-3">월별 감성 점수</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}점`, '감성 점수']}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#1E5FA8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#1E5FA8', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 오른쪽: 도넛차트 (감성 비율) */}
        {ratio && total > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-3">감성 비율</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value}건`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* 범례 */}
              <div className="space-y-2">
                {pieData.map((d, idx) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[idx] }}
                    />
                    <span className="text-xs text-gray-600">{d.name}</span>
                    <span className="text-xs font-semibold text-gray-900">
                      {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
