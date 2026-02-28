import { useEffect, useState } from 'react';
import client from '../api/client';
import StatCard from '../components/StatCard';

/** 병원 데이터 인터페이스 */
interface Hospital {
  hospital_id: number;
  name: string;
  address: string;
  category: string;
  avg_rating: number;
  review_count: number;
  foreign_friendly: boolean;
  languages_supported: string[];
  has_interpreter: boolean;
  accepts_foreign_insurance: boolean;
}

/** 인증 체크리스트 항목 */
interface ChecklistItem {
  met: boolean;
  label: string;
  current?: number;
  required?: number;
}

/** 인증 응답 데이터 */
interface CertificationResult {
  certified: boolean;
  checklist: {
    hasEnglishInfo: ChecklistItem;
    hasForeignPatients: ChecklistItem;
    hasEnglishReviews: ChecklistItem;
  };
}

/** 병원 프로필 & 외국인 친화 인증 페이지 */
export default function ProfilePage() {
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [certifying, setCertifying] = useState(false);
  const [certResult, setCertResult] = useState<CertificationResult | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadHospital();
  }, []);

  // 토스트 자동 닫기
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  /** 병원 정보 로드 */
  const loadHospital = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.hospital_id) return;

      const { data } = await client.get(`/hospitals/${user.hospital_id}`);
      setHospital(data.data.hospital);
    } catch {
      // 에러 시 기본값 유지
    } finally {
      setLoading(false);
    }
  };

  /** 외국인 친화 인증 신청 */
  const handleCertify = async () => {
    if (!hospital) return;
    setCertifying(true);
    setCertResult(null);

    try {
      const { data } = await client.post(`/hospitals/${hospital.hospital_id}/foreign-certification`);
      const result = data.data as CertificationResult;
      setCertResult(result);

      if (result.certified) {
        setToast({ type: 'success', message: '외국인 친화 병원 인증이 완료되었습니다!' });
        // 병원 데이터 갱신
        setHospital((prev) => prev ? { ...prev, foreign_friendly: true } : prev);
      } else {
        setToast({ type: 'error', message: '인증 조건을 모두 충족해야 합니다.' });
      }
    } catch {
      setToast({ type: 'error', message: '인증 요청 중 오류가 발생했습니다.' });
    } finally {
      setCertifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#1E5FA8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="text-center py-16 text-gray-500">
        병원 정보를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 토스트 알림 */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* 페이지 제목 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">병원 프로필</h2>
        <p className="text-sm text-gray-500 mt-0.5">병원 정보와 외국인 친화 인증을 관리하세요</p>
      </div>

      {/* 병원 기본 정보 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="병원 이름"
          value={hospital.name}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          title="카테고리"
          value={hospital.category}
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
        />
        <StatCard
          title="평균 평점"
          value={Number(hospital.avg_rating || 0).toFixed(1)}
          subtitle={`리뷰 ${hospital.review_count}개`}
          color="orange"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
        />
        <StatCard
          title="주소"
          value={hospital.address || '-'}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>

      {/* 외국인 친화 인증 섹션 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-6 h-6 text-[#1E5FA8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-base font-semibold text-gray-900">외국인 친화 병원 인증</h3>
        </div>

        {hospital.foreign_friendly ? (
          /* ── 인증 완료 상태 ── */
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                인증 완료
              </span>
            </div>
            <p className="text-sm text-emerald-800 font-medium">
              외국인 친화 인증 병원으로 등록되었습니다.
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              외국인 전용 앱 검색에서 우선 노출됩니다.
            </p>
          </div>
        ) : (
          /* ── 미인증 상태 ── */
          <div>
            <p className="text-sm text-gray-600 mb-4">
              아래 조건을 모두 충족하면 외국인 친화 병원 인증을 받을 수 있습니다.
              인증 시 외국인 전용 앱 검색에서 우선 노출됩니다.
            </p>

            {/* 체크리스트 */}
            <div className="space-y-3 mb-5">
              {certResult ? (
                /* 인증 시도 후 결과 체크리스트 */
                Object.values(certResult.checklist).map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                      item.met
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {item.met ? (
                      <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <div className="min-w-0">
                      <span className={`text-sm font-medium ${item.met ? 'text-emerald-700' : 'text-red-700'}`}>
                        {item.label}
                      </span>
                      {item.current !== undefined && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({item.current}/{item.required})
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                /* 인증 시도 전 기본 체크리스트 */
                <>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                    <span className="text-sm text-gray-600">영문 병원 정보 등록</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                    <span className="text-sm text-gray-600">외국인 환자 5명 이상</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                    <span className="text-sm text-gray-600">영문 리뷰 3개 이상</span>
                  </div>
                </>
              )}
            </div>

            {/* 인증 신청 버튼 */}
            <button
              onClick={handleCertify}
              disabled={certifying}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E5FA8] text-white text-sm font-medium rounded-lg hover:bg-[#174b8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {certifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  검증 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  인증 신청
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
