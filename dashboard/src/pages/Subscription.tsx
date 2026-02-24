import { useEffect, useState } from 'react';
import client from '../api/client';

/* ── 타입 정의 ─────────────────────────────────────────── */

interface Plan {
  tier: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
  yearly_monthly_price: number;
  features: string[];
}

interface SubscriptionInfo {
  sub_id: number;
  tier: string;
  price: number;
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  cancelled_at: string | null;
}

interface PaymentRecord {
  payment_id: number;
  amount: number;
  status: string;
  tier?: string;
  paid_at: string;
  created_at: string;
}

interface MySubscriptionData {
  current_tier: string;
  subscription: SubscriptionInfo | null;
  payments: PaymentRecord[];
}

/* ── 플랜별 기능 체크리스트 ─────────────────────────────── */

const PLAN_FEATURES: Record<string, { label: string; included: boolean }[]> = {
  FREE: [
    { label: '기본 병원 프로필', included: true },
    { label: '기본 노출', included: true },
    { label: '예약 관리', included: false },
    { label: '환자 CRM', included: false },
    { label: '월간 통계', included: false },
    { label: 'AI 리뷰 분석', included: false },
    { label: '실시간 채팅', included: false },
    { label: '마케팅 자동화', included: false },
  ],
  BASIC: [
    { label: '기본 병원 프로필', included: true },
    { label: '기본 노출', included: true },
    { label: '예약 관리', included: true },
    { label: '환자 CRM', included: true },
    { label: '월간 통계', included: true },
    { label: 'AI 리뷰 분석', included: false },
    { label: '실시간 채팅', included: false },
    { label: '마케팅 자동화', included: false },
  ],
  PRO: [
    { label: '기본 병원 프로필', included: true },
    { label: '기본 노출', included: true },
    { label: '예약 관리', included: true },
    { label: '환자 CRM', included: true },
    { label: '월간 통계', included: true },
    { label: 'AI 리뷰 분석', included: true },
    { label: '실시간 채팅', included: true },
    { label: '마케팅 자동화', included: true },
  ],
};

/* ── 배지 색상 ─────────────────────────────────────────── */

const TIER_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  BASIC: 'bg-blue-100 text-blue-700',
  PRO: 'bg-purple-100 text-purple-700',
};

const TIER_BORDER: Record<string, string> = {
  FREE: 'border-gray-200',
  BASIC: 'border-blue-300',
  PRO: 'border-purple-300',
};

/* ── 결제 상태 배지 ────────────────────────────────────── */

const STATUS_BADGE: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
  CANCEL: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<string, string> = {
  SUCCESS: '성공',
  FAIL: '실패',
  CANCEL: '취소',
};

/* ── 메인 컴포넌트 ─────────────────────────────────────── */

/** 구독 관리 페이지 */
export default function Subscription() {
  const [data, setData] = useState<MySubscriptionData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);

  // 업그레이드 유도 모달
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: string }>({
    open: false,
    feature: '',
  });

  // 취소 확인 모달
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  /** 구독 현황 + 플랜 목록 동시 로드 */
  const loadData = async () => {
    try {
      const [myRes, plansRes] = await Promise.all([
        client.get('/subscriptions/my'),
        client.get('/subscriptions/plans'),
      ]);
      setData(myRes.data.data);
      setPlans(plansRes.data.data.plans);
    } catch {
      // 에러 시 기본값 유지
    } finally {
      setLoading(false);
    }
  };

  /** 구독 취소 처리 */
  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      await client.post('/subscriptions/cancel', { reason: cancelReason || '사유 미입력' });
      setCancelModal(false);
      setCancelReason('');
      await loadData();
    } catch {
      alert('구독 취소에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setCancelLoading(false);
    }
  };

  /** 결제 시작 (checkout) */
  const handleCheckout = async (tier: string) => {
    try {
      const res = await client.post('/subscriptions/checkout', {
        tier,
        billing_period: 'monthly',
      });
      // 토스페이먼츠 결제 위젯 연동 (실제 구현 시 토스 SDK 사용)
      alert(`결제 페이지로 이동합니다.\n주문 ID: ${res.data.data.orderId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || '결제 요청에 실패했습니다.');
    }
  };

  /* ── 로딩 ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#1E5FA8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentTier = data?.current_tier || 'FREE';
  const subscription = data?.subscription;
  const payments = data?.payments || [];

  return (
    <div className="space-y-6">
      {/* 페이지 제목 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">구독 관리</h2>
        <p className="text-sm text-gray-500 mt-0.5">플랜을 관리하고 결제 내역을 확인하세요</p>
      </div>

      {/* ── 1. 현재 플랜 카드 ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">현재 플랜</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIER_COLORS[currentTier]}`}>
                {currentTier}
              </span>
            </div>
            {subscription ? (
              <div className="text-sm text-gray-500 space-y-1">
                <p>결제 금액: <span className="text-gray-900 font-medium">{subscription.price.toLocaleString()}원/월</span></p>
                <p>다음 결제일: <span className="text-gray-900 font-medium">{subscription.expires_at?.split('T')[0]}</span></p>
                {subscription.cancelled_at && (
                  <p className="text-red-500">취소됨 — {subscription.expires_at?.split('T')[0]}까지 이용 가능</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">무료 플랜을 사용 중입니다</p>
            )}
          </div>

          {/* 버튼 그룹 */}
          <div className="flex gap-2">
            {currentTier !== 'FREE' && !subscription?.cancelled_at && (
              <button
                onClick={() => setCancelModal(true)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                구독 취소
              </button>
            )}
            {currentTier !== 'PRO' && (
              <button
                onClick={() => handleCheckout(currentTier === 'FREE' ? 'BASIC' : 'PRO')}
                className="px-4 py-2 text-sm bg-[#1E5FA8] text-white rounded-lg hover:bg-[#174d8a] transition-colors"
              >
                플랜 변경
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. 플랜 비교 카드 ── */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">플랜 비교</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.tier === currentTier;
            const features = PLAN_FEATURES[plan.tier] || [];

            return (
              <div
                key={plan.tier}
                className={`bg-white rounded-xl border-2 p-6 flex flex-col ${
                  isCurrent ? TIER_BORDER[plan.tier] : 'border-gray-200'
                }`}
              >
                {/* 플랜 헤더 */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-900">{plan.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TIER_COLORS[plan.tier]}`}>
                      {plan.tier}
                    </span>
                  </div>
                  <div className="mt-2">
                    {plan.monthly_price > 0 ? (
                      <>
                        <span className="text-2xl font-bold text-gray-900">
                          {plan.monthly_price.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500">원/월</span>
                        <p className="text-xs text-gray-400 mt-0.5">
                          연간 결제 시 {plan.yearly_monthly_price.toLocaleString()}원/월
                        </p>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-gray-900">무료</span>
                    )}
                  </div>
                </div>

                {/* 기능 체크리스트 */}
                <ul className="space-y-2 flex-1 mb-5">
                  {features.map((f) => (
                    <li key={f.label} className="flex items-center gap-2 text-sm">
                      {f.included ? (
                        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={f.included ? 'text-gray-700' : 'text-gray-400'}>{f.label}</span>
                    </li>
                  ))}
                </ul>

                {/* 하단 버튼 */}
                {isCurrent ? (
                  <div className="w-full py-2.5 text-center text-sm font-medium bg-gray-100 text-gray-600 rounded-lg">
                    현재 이용 중
                  </div>
                ) : plan.tier === 'FREE' ? (
                  <div />
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.tier)}
                    className="w-full py-2.5 text-sm font-medium bg-[#1E5FA8] text-white rounded-lg hover:bg-[#174d8a] transition-colors"
                  >
                    업그레이드
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. 결제 내역 테이블 ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">결제 내역</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">결제 내역이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-3 font-medium text-gray-500">날짜</th>
                  <th className="pb-3 font-medium text-gray-500">플랜</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">금액</th>
                  <th className="pb-3 font-medium text-gray-500 text-center">상태</th>
                  <th className="pb-3 font-medium text-gray-500 text-center">영수증</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.payment_id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 text-gray-700">
                      {(p.paid_at || p.created_at)?.split('T')[0]}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TIER_COLORS[p.tier || 'FREE']}`}>
                        {p.tier || '-'}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-900 font-medium">
                      {p.amount.toLocaleString()}원
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[p.status] || ''}`}>
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <button className="text-[#1E5FA8] hover:underline text-xs">
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 업그레이드 유도 모달 ── */}
      {upgradeModal.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              {/* 자물쇠 아이콘 */}
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900">프리미엄 기능</h4>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{upgradeModal.feature}</strong> 기능은 BASIC 플랜 이상에서 사용할 수 있습니다.
              업그레이드하면 더 많은 기능을 이용할 수 있습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setUpgradeModal({ open: false, feature: '' })}
                className="flex-1 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setUpgradeModal({ open: false, feature: '' });
                  handleCheckout('BASIC');
                }}
                className="flex-1 py-2.5 text-sm bg-[#1E5FA8] text-white rounded-lg hover:bg-[#174d8a] transition-colors"
              >
                업그레이드하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 구독 취소 확인 모달 ── */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h4 className="font-bold text-gray-900 mb-2">구독을 취소하시겠습니까?</h4>
            <p className="text-sm text-gray-500 mb-4">
              취소해도 현재 결제 기간이 끝날 때까지 서비스를 이용할 수 있습니다.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="취소 사유를 입력해주세요 (선택)"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-20 mb-4 focus:outline-none focus:ring-2 focus:ring-[#1E5FA8] focus:border-transparent"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCancelModal(false);
                  setCancelReason('');
                }}
                className="flex-1 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                돌아가기
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1 py-2.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {cancelLoading ? '처리 중...' : '구독 취소'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 기능 잠금 컴포넌트 (외부에서 사용) ────────────────── */

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
