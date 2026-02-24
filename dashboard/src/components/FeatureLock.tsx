import { useState } from 'react';

/**
 * 플랜 기반 기능 잠금 래퍼
 * FREE 사용자가 BASIC 전용 기능을 클릭하면 업그레이드 모달 표시
 *
 * 사용 예:
 *   <FeatureLock currentTier="FREE" requiredTier="BASIC" featureName="예약 관리">
 *     <ReservationList />
 *   </FeatureLock>
 */
export function FeatureLock({
  currentTier,
  requiredTier,
  featureName,
  children,
  onUpgrade,
}: {
  currentTier: string;
  requiredTier: 'BASIC' | 'PRO';
  featureName: string;
  children: React.ReactNode;
  onUpgrade?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);

  const tierLevel: Record<string, number> = { FREE: 0, BASIC: 1, PRO: 2 };
  const hasAccess = (tierLevel[currentTier] || 0) >= (tierLevel[requiredTier] || 0);

  if (hasAccess) return <>{children}</>;

  return (
    <>
      {/* 잠긴 영역: 블러 + 자물쇠 오버레이 */}
      <div className="relative">
        <div className="pointer-events-none opacity-40 blur-[1px]">{children}</div>
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={() => setShowModal(true)}
        >
          <div className="bg-white/90 border border-gray-200 rounded-xl px-5 py-3 flex items-center gap-2 shadow-sm">
            <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">{requiredTier} 플랜 필요</span>
          </div>
        </div>
      </div>

      {/* 업그레이드 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900">프리미엄 기능</h4>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{featureName}</strong> 기능은 {requiredTier} 플랜 이상에서 사용할 수 있습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  onUpgrade?.();
                }}
                className="flex-1 py-2.5 text-sm bg-[#1E5FA8] text-white rounded-lg hover:bg-[#174d8a] transition-colors"
              >
                업그레이드하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
