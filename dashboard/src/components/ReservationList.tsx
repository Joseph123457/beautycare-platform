interface Reservation {
  reservation_id: string;
  treatment_name: string;
  reserved_at: string;
  status: string;
  memo: string | null;
  user_name: string;
  user_phone: string;
}

interface Props {
  reservations: Reservation[];
  onStatusChange?: (id: string, status: string) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING:   { label: '대기',   className: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: '확정',   className: 'bg-blue-100 text-blue-700' },
  DONE:      { label: '완료',   className: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: '취소',   className: 'bg-gray-100 text-gray-500' },
};

/** 예약 목록 테이블 컴포넌트 */
export default function ReservationList({ reservations, onStatusChange }: Props) {
  if (reservations.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        예약 내역이 없습니다
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-3 font-medium">환자명</th>
            <th className="pb-3 font-medium">시술명</th>
            <th className="pb-3 font-medium">예약일시</th>
            <th className="pb-3 font-medium">상태</th>
            <th className="pb-3 font-medium">메모</th>
            {onStatusChange && <th className="pb-3 font-medium">관리</th>}
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => {
            const status = statusConfig[r.status] || statusConfig.PENDING;
            const date = new Date(r.reserved_at);
            const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
            const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            return (
              <tr key={r.reservation_id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3">
                  <div className="font-medium text-gray-900">{r.user_name}</div>
                  <div className="text-xs text-gray-400">{r.user_phone}</div>
                </td>
                <td className="py-3 text-gray-700">{r.treatment_name}</td>
                <td className="py-3 text-gray-700">
                  <div>{dateStr}</div>
                  <div className="text-xs text-gray-400">{timeStr}</div>
                </td>
                <td className="py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </td>
                <td className="py-3 text-gray-500 max-w-[200px] truncate">
                  {r.memo || '-'}
                </td>
                {onStatusChange && r.status === 'PENDING' && (
                  <td className="py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onStatusChange(r.reservation_id, 'CONFIRMED')}
                        className="px-2 py-1 text-xs rounded bg-[#1E5FA8] text-white hover:bg-[#1E5FA8]/90"
                      >
                        확정
                      </button>
                      <button
                        onClick={() => onStatusChange(r.reservation_id, 'CANCELLED')}
                        className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                      >
                        취소
                      </button>
                    </div>
                  </td>
                )}
                {onStatusChange && r.status !== 'PENDING' && (
                  <td className="py-3 text-gray-400 text-xs">-</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
