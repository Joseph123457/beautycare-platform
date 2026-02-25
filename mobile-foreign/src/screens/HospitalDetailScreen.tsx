/**
 * 병원 상세 화면 (외국인 특화 버전)
 *
 * 1. 외국인 친화 정보 섹션 (통역, 외국인 비율, 전용 패키지)
 * 2. 가격: KRW + 선택 통화 동시 표시 + 상담비 포함 여부
 * 3. 리뷰: 전체/외국인 탭 + 국기 이모지 + 번역 버튼
 * 4. 예약 추가 정보: 통역사 동행, 여권, 보험번호
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { Hospital, Treatment, Review, RootStackParamList } from '../types';
import { useCurrency } from '../hooks/useCurrency';
import { useLanguage } from '../context/LanguageContext';

type DetailRoute = RouteProp<RootStackParamList, 'HospitalDetail'>;
type Nav = StackNavigationProp<RootStackParamList>;

// 국가 코드 → 국기 이모지 매핑
const COUNTRY_FLAGS: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}', JP: '\u{1F1EF}\u{1F1F5}', CN: '\u{1F1E8}\u{1F1F3}',
  TW: '\u{1F1F9}\u{1F1FC}', TH: '\u{1F1F9}\u{1F1ED}', VN: '\u{1F1FB}\u{1F1F3}',
  PH: '\u{1F1F5}\u{1F1ED}', SG: '\u{1F1F8}\u{1F1EC}', AU: '\u{1F1E6}\u{1F1FA}',
  GB: '\u{1F1EC}\u{1F1E7}', DE: '\u{1F1E9}\u{1F1EA}', FR: '\u{1F1EB}\u{1F1F7}',
  RU: '\u{1F1F7}\u{1F1FA}', KR: '\u{1F1F0}\u{1F1F7}',
};

// ─── 별점 컴포넌트 ─────────────────────────────────────

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: size, color: i <= rounded ? '#E8772E' : '#D1D5DB' }}>
          {'\u2605'}
        </Text>
      ))}
    </View>
  );
}

// ─── 외국인 친화 정보 카드 ─────────────────────────────

function ForeignInfoSection({ hospital, t }: { hospital: Hospital; t: any }) {
  // 외국인 비율 (서버에서 내려주지 않으면 기본 추정값)
  const foreignRatio = (hospital as any).foreign_patient_ratio || 25;
  const hasForeignPackage = (hospital as any).has_foreign_package ?? false;
  const consultIncluded = (hospital as any).consult_fee_included ?? true;

  return (
    <View style={s.foreignSection}>
      <Text style={s.foreignSectionTitle}>
        {'\u{1F30F}'} {t('hospital.foreignInfo')}
      </Text>

      {/* 외국인 환자 비율 */}
      <View style={s.foreignStatRow}>
        <View style={s.foreignStatBar}>
          <View style={[s.foreignStatFill, { width: `${foreignRatio}%` }]} />
        </View>
        <Text style={s.foreignStatText}>
          {t('hospital.foreignPatientRatio', { ratio: foreignRatio })}
        </Text>
      </View>

      {/* 통역 서비스 뱃지들 */}
      <View style={s.langBadgeRow}>
        {hospital.has_interpreter && (
          <View style={s.langBadge}>
            <Text style={s.langBadgeText}>{'\u{1F1F0}\u{1F1F7}'} {t('hospital.koreanInterpreter')}</Text>
          </View>
        )}
        {hospital.english_available && (
          <View style={s.langBadge}>
            <Text style={s.langBadgeText}>{'\u{1F1FA}\u{1F1F8}'} {t('hospital.englishConsult')}</Text>
          </View>
        )}
        <View style={s.langBadge}>
          <Text style={s.langBadgeText}>{'\u{1F1E8}\u{1F1F3}'} {t('hospital.chineseConsult')}</Text>
        </View>
      </View>

      {/* 외국인 전용 패키지 */}
      <View style={[s.packageCard, hasForeignPackage ? s.packageCardYes : s.packageCardNo]}>
        <Text style={s.packageIcon}>{hasForeignPackage ? '\u{1F381}' : '\u{1F4E6}'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.packageTitle}>{t('hospital.foreignPackage')}</Text>
          <Text style={s.packageDesc}>
            {hasForeignPackage ? t('hospital.foreignPackageAvailable') : t('hospital.foreignPackageNone')}
          </Text>
        </View>
      </View>

      {/* 상담비 포함 여부 */}
      <View style={s.consultFeeRow}>
        <Text style={s.consultFeeIcon}>{consultIncluded ? '\u2705' : '\u26A0\uFE0F'}</Text>
        <Text style={[s.consultFeeText, !consultIncluded && { color: '#B45309' }]}>
          {consultIncluded ? t('hospital.consultIncluded') : t('hospital.consultNotIncluded')}
        </Text>
      </View>
    </View>
  );
}

// ─── 리뷰 카드 (번역 버튼 + 국기) ─────────────────────

function ReviewCard({ review, t, language }: { review: Review; t: any; language: string }) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  // 국기 이모지
  const nationality = (review as any).nationality || '';
  const flag = COUNTRY_FLAGS[nationality] || (review.is_foreign ? '\u{1F30F}' : '');

  // 번역 요청 (백엔드 번역 API 또는 Google Translate 딥링크)
  const handleTranslate = useCallback(async () => {
    if (translated) { setTranslated(null); return; } // 토글

    setTranslating(true);
    try {
      // 백엔드 번역 API 시도
      const { data } = await client.post('/translate', {
        text: review.content,
        target: language,
      });
      setTranslated(data.data?.translated || null);
    } catch {
      // 폴백: Google Translate URL 열기
      const encoded = encodeURIComponent(review.content);
      const url = `https://translate.google.com/?sl=ko&tl=${language}&text=${encoded}`;
      Linking.openURL(url);
    } finally {
      setTranslating(false);
    }
  }, [review.content, language, translated]);

  return (
    <View style={s.reviewCard}>
      <View style={s.reviewTop}>
        {/* 국기 + 작성자 */}
        {flag ? <Text style={s.reviewFlag}>{flag}</Text> : null}
        <Text style={s.reviewAuthor}>{review.author_name}</Text>
        {nationality && (
          <Text style={s.reviewNation}>
            {t('hospital.reviewNationality', { country: nationality })}
          </Text>
        )}
        <View style={{ flex: 1 }} />
        <Stars rating={review.rating} size={12} />
      </View>

      {/* 리뷰 내용 */}
      <Text style={s.reviewContent}>{translated || review.content}</Text>

      {/* 번역 버튼 */}
      <View style={s.reviewBottom}>
        <Text style={s.reviewDate}>
          {new Date(review.created_at).toLocaleDateString()}
        </Text>
        <TouchableOpacity style={s.translateBtn} onPress={handleTranslate}>
          <Text style={s.translateBtnText}>
            {translating ? t('hospital.translating')
              : translated ? '\u{1F1F0}\u{1F1F7} Original'
              : `\u{1F310} ${t('hospital.translateReview')}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════

export default function HospitalDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { convert, symbol, currency } = useCurrency();
  const { language } = useLanguage();

  const { hospitalId } = route.params;

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // 리뷰 탭: all / foreign
  const [reviewTab, setReviewTab] = useState<'all' | 'foreign'>('all');

  // 데이터 로드
  useEffect(() => {
    (async () => {
      try {
        const [detailRes, reviewRes] = await Promise.all([
          client.get(`/hospitals/${hospitalId}`),
          client.get(`/hospitals/${hospitalId}/reviews`, { params: { limit: 20 } }),
        ]);
        const data = detailRes.data.data;
        setHospital(data);
        setTreatments(data.treatments || []);
        setReviews(reviewRes.data.data || []);
      } catch {
        // 에러 무시
      } finally {
        setLoading(false);
      }
    })();
  }, [hospitalId]);

  // 리뷰 필터
  const filteredReviews = reviewTab === 'foreign'
    ? reviews.filter((r) => r.is_foreign)
    : reviews;
  const foreignReviewCount = reviews.filter((r) => r.is_foreign).length;

  // ─── 로딩 / 에러 ────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color="#E8772E" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!hospital) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorContainer}>
          <Text style={{ fontSize: 48 }}>{'\u{1F3E5}'}</Text>
          <Text style={s.errorText}>Clinic not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 렌더링 ─────────────────────────────────────────

  return (
    <SafeAreaView style={s.container} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* 병원 이미지 영역 */}
        <View style={s.imageArea}>
          <Text style={{ fontSize: 56 }}>{'\u{1F3E5}'}</Text>
          {/* 인증 뱃지 오버레이 */}
          {hospital.is_verified && (
            <View style={s.verifiedOverlay}>
              <Text style={s.verifiedOverlayText}>{'\u2713'} {t('hospital.verified')}</Text>
            </View>
          )}
        </View>

        {/* ═══ 기본 정보 섹션 ═══ */}
        <View style={s.infoSection}>
          <Text style={s.hospitalName}>
            {hospital.name_en || hospital.name}
          </Text>

          {/* 외국인 친화 뱃지들 */}
          <View style={s.badgeRow}>
            {hospital.english_available && (
              <View style={s.greenBadge}>
                <Text style={s.greenBadgeText}>{'\u{1F1FA}\u{1F1F8}'} {t('hospital.englishConsultation')}</Text>
              </View>
            )}
            {hospital.has_interpreter && (
              <View style={s.blueBadge}>
                <Text style={s.blueBadgeText}>{'\u{1F524}'} {t('hospital.interpreterService')}</Text>
              </View>
            )}
          </View>

          {/* 별점 + 리뷰 */}
          <View style={s.ratingRow}>
            <Stars rating={hospital.avg_rating} size={18} />
            <Text style={s.ratingNum}>{hospital.avg_rating?.toFixed(1)}</Text>
            <Text style={s.reviewCount}>({hospital.review_count} reviews)</Text>
          </View>

          {/* 주소 */}
          <View style={s.addressRow}>
            <Text style={s.addressIcon}>{'\u{1F4CD}'}</Text>
            <Text style={s.addressText}>
              {hospital.address_en || hospital.address}
            </Text>
          </View>

          {/* 설명 */}
          {(hospital.description_en || hospital.description) && (
            <View style={s.descSection}>
              <Text style={s.descTitle}>{t('hospital.about')}</Text>
              <Text style={s.descText}>
                {hospital.description_en || hospital.description}
              </Text>
            </View>
          )}
        </View>

        {/* ═══ 외국인 친화 정보 섹션 ═══ */}
        <ForeignInfoSection hospital={hospital} t={t} />

        {/* ═══ 시술 목록 (이중 가격 표시) ═══ */}
        {treatments.length > 0 && (
          <View style={s.treatmentSection}>
            <Text style={s.sectionTitle}>{t('hospital.treatments')}</Text>
            {treatments.map((tr) => (
              <View key={tr.treatment_id} style={s.treatmentCard}>
                <View style={s.treatmentInfo}>
                  <Text style={s.treatmentName}>
                    {tr.name_en || tr.name}
                  </Text>
                  {(tr.description_en || tr.description) && (
                    <Text style={s.treatmentDesc} numberOfLines={2}>
                      {tr.description_en || tr.description}
                    </Text>
                  )}
                  <Text style={s.treatmentDuration}>
                    {'\u23F1'} {t('hospital.duration', { min: tr.duration_min })}
                  </Text>
                </View>
                {/* 이중 가격 표시 */}
                <View style={s.treatmentPriceBox}>
                  <Text style={s.treatmentPriceForeign}>
                    {convert(tr.price)}
                  </Text>
                  <Text style={s.treatmentPriceKrw}>
                    {'\u20A9'}{tr.price.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ═══ 리뷰 섹션 (전체/외국인 탭) ═══ */}
        <View style={s.reviewSection}>
          <View style={s.reviewHeader}>
            <Text style={s.sectionTitle}>{t('hospital.reviews')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ReviewList', {
              hospitalId, hospitalName: hospital.name_en || hospital.name,
            })}>
              <Text style={s.seeAllBtn}>{t('common.seeAll')}</Text>
            </TouchableOpacity>
          </View>

          {/* 리뷰 탭 */}
          <View style={s.reviewTabRow}>
            <TouchableOpacity
              style={[s.reviewTabBtn, reviewTab === 'all' && s.reviewTabBtnActive]}
              onPress={() => setReviewTab('all')}
            >
              <Text style={[s.reviewTabText, reviewTab === 'all' && s.reviewTabTextActive]}>
                {t('hospital.allReviews')} ({reviews.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.reviewTabBtn, reviewTab === 'foreign' && s.reviewTabBtnActive]}
              onPress={() => setReviewTab('foreign')}
            >
              <Text style={[s.reviewTabText, reviewTab === 'foreign' && s.reviewTabTextActive]}>
                {'\u{1F30F}'} {t('hospital.foreignReviews')} ({foreignReviewCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* 리뷰 목록 */}
          {filteredReviews.length === 0 ? (
            <Text style={s.noReviews}>{t('hospital.noReviews')}</Text>
          ) : (
            filteredReviews.slice(0, 5).map((rv) => (
              <ReviewCard key={rv.review_id} review={rv} t={t} language={language} />
            ))
          )}
        </View>
      </ScrollView>

      {/* ═══ 하단 고정: 예약 버튼 ═══ */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.consultBtn}
          onPress={() => {}}
        >
          <Text style={s.consultBtnText}>{t('hospital.consultation')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.bookNowBtn}
          onPress={() => navigation.navigate('Booking', {
            hospitalId, hospitalName: hospital.name_en || hospital.name,
          })}
        >
          <Text style={s.bookNowBtnText}>{t('hospital.bookNow')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════
// 스타일
// ═══════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // 이미지 영역
  imageArea: {
    height: 220, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  verifiedOverlay: {
    position: 'absolute', top: 16, right: 16,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: 'rgba(5,150,105,0.9)',
  },
  verifiedOverlayText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  // 기본 정보
  infoSection: { padding: 20, paddingBottom: 0 },
  hospitalName: { fontSize: 24, fontWeight: '800', color: '#1F2937' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  greenBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#D1FAE5' },
  greenBadgeText: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  blueBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#DBEAFE' },
  blueBadgeText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 4 },
  ratingNum: { fontSize: 20, fontWeight: '800', color: '#E8772E' },
  reviewCount: { fontSize: 13, color: '#6B7280' },

  addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  addressIcon: { fontSize: 14, marginRight: 6, marginTop: 2 },
  addressText: { flex: 1, fontSize: 13, color: '#6B7280', lineHeight: 20 },

  descSection: { marginTop: 16 },
  descTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  descText: { fontSize: 13, color: '#4B5563', lineHeight: 22 },

  // ─── 외국인 친화 정보 섹션 ─────────────────────────
  foreignSection: {
    marginHorizontal: 16, marginTop: 20, padding: 18,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  foreignSectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 14 },

  // 외국인 비율 바
  foreignStatRow: { marginBottom: 14 },
  foreignStatBar: {
    height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 6,
  },
  foreignStatFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 4 },
  foreignStatText: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },

  // 통역 뱃지
  langBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  langBadge: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
  },
  langBadgeText: { fontSize: 11, fontWeight: '600', color: '#1D4ED8' },

  // 외국인 패키지
  packageCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 12, marginBottom: 10,
  },
  packageCardYes: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#A7F3D0' },
  packageCardNo: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  packageIcon: { fontSize: 24, marginRight: 12 },
  packageTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  packageDesc: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  // 상담비
  consultFeeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  consultFeeIcon: { fontSize: 14 },
  consultFeeText: { fontSize: 12, fontWeight: '600', color: '#059669' },

  // ─── 시술 (이중 가격) ──────────────────────────────
  treatmentSection: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 12 },

  treatmentCard: {
    flexDirection: 'row', padding: 16, marginBottom: 10,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  treatmentInfo: { flex: 1 },
  treatmentName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  treatmentDesc: { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 18 },
  treatmentDuration: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  treatmentPriceBox: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 12 },
  treatmentPriceForeign: { fontSize: 18, fontWeight: '800', color: '#E8772E' },
  treatmentPriceKrw: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },

  // ─── 리뷰 (탭 + 번역) ─────────────────────────────
  reviewSection: { paddingHorizontal: 16, marginTop: 20 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  seeAllBtn: { fontSize: 13, fontWeight: '600', color: '#E8772E' },

  reviewTabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  reviewTabBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  reviewTabBtnActive: { backgroundColor: '#E8772E', borderColor: '#E8772E' },
  reviewTabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  reviewTabTextActive: { color: '#FFFFFF' },

  noReviews: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 24 },

  reviewCard: {
    padding: 16, marginBottom: 10, backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  reviewFlag: { fontSize: 16 },
  reviewAuthor: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  reviewNation: { fontSize: 11, color: '#9CA3AF' },
  reviewContent: { fontSize: 13, color: '#4B5563', lineHeight: 21 },
  reviewBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10,
  },
  reviewDate: { fontSize: 11, color: '#9CA3AF' },
  translateBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  translateBtnText: { fontSize: 11, fontWeight: '600', color: '#3B82F6' },

  // ─── 에러 ──────────────────────────────────────────
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: '#6B7280', marginTop: 12 },

  // ─── 하단 바 ──────────────────────────────────────
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  consultBtn: {
    flex: 1, height: 52, borderRadius: 14,
    backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E8772E',
    alignItems: 'center', justifyContent: 'center',
  },
  consultBtnText: { fontSize: 14, fontWeight: '700', color: '#E8772E' },
  bookNowBtn: {
    flex: 1, height: 52, borderRadius: 14,
    backgroundColor: '#E8772E',
    alignItems: 'center', justifyContent: 'center',
  },
  bookNowBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
