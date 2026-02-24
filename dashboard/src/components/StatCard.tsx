interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'orange' | 'green' | 'red';
}

const colorMap = {
  blue: 'bg-[#1E5FA8]/10 text-[#1E5FA8]',
  orange: 'bg-[#E8772E]/10 text-[#E8772E]',
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
};

/** 대시보드 지표 카드 */
export default function StatCard({ title, value, subtitle, icon, color = 'blue' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-lg shrink-0 ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
