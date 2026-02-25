/**
 * 홈 화면 (외국인 의료관광 전용)
 * K-Beauty 헤더 + 인기 카테고리 + 당일 예약 가능 + 환율 + 체류 기간 추천
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import client from '../api/client';
import { Hospital, RootStackParamList } from '../types';
import { useCurrency } from '../hooks/useCurrency';

type Nav = StackNavigationProp<RootStackParamList>;

// ─── 카테고리 (다국어 키 기반) ─────────────────────────

const CATEGORIES = [
  { key: '',           labelKey: 'categories.all',         icon: '\u{1F3E5}' },
  { key: '\uC131\uD615\uC678\uACFC', labelKey: 'categories.plastic',     icon: '\u2728' },
  { key: '\uD53C\uBD80\uACFC',     labelKey: 'categories.dermatology', icon: '\u{1F9F4}' },
  { key: '\uCE58\uACFC',         labelKey: 'categories.dental',      icon: '\u{1F9B7}' },
  { key: '\uC548\uACFC',         labelKey: 'categories.eye',         icon: '\u{1F441}\u{FE0F}' },
];

// 체류 기간별 추천 시술
const STAY_RECOMMENDATIONS: Record<number, string[]> = {
  3: ['Botox', 'Filler', 'Skin Laser', 'Teeth Whitening'],
  5: ['Rhinoplasty', 'Double Eyelid', 'Fat Grafting', 'Dental Implant'],
  7: ['Facelift', 'Liposuction', 'Jaw Surgery', 'Full Mouth Restoration'],
  14: ['Full Face Contouring', 'Breast Augmentation', 'Body Contouring', 'Hair Transplant'],
};

// ─── 별점 렌더링 ───────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  const stars: React.ReactNode[] = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Text key={i} style={{ fontSize: 13, color: i <= rounded ? '#E8772E' : '#D1D5DB' }}>
        {'\u2605'}
      </Text>
    );
  }
  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
}

// ─── 스켈레톤 카드 ─────────────────────────────────────

function SkeletonCard() {
  return (
    <View style={styles.hospitalCard}>
      <View style={[styles.cardThumb, styles.skeleton]} />
      <View style={styles.cardBody}>
        <View style={[styles.skeleton, { width: 140, height: 16, borderRadius: 4 }]} />
        <View style={[styles.skeleton, { width: 80, height: 12, borderRadius: 4, marginTop: 6 }]} />
        <View style={[styles.skeleton, { width: 100, height: 12, borderRadius: 4, marginTop: 8 }]} />
      </View>
    </View>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { convert, getRateDisplay } = useCurrency();

  // 위치 상태
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 데이터 상태
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 체류 기간 입력
  const [stayDays, setStayDays] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);

  // ─── 1. GPS 위치 획득 ─────────────────────────────────

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coords = { lat: 37.4979, lng: 127.0276 }; // 강남역 기본

      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        } catch {
          // 기본 좌표 사용
        }
      }
      setLocation(coords);
    })();
  }, []);

  // ─── 2. 병원 목록 불러오기 ────────────────────────────

  const loadHospitals = useCallback(async (coords: { lat: number; lng: number }) => {
    try {
      const { data } = await client.get('/hospitals/search', {
        params: { lat: coords.lat, lng: coords.lng, radius: 10, limit: 20 },
      });
      setHospitals(data.data || []);
    } catch {
      // 에러 시 빈 배열
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (location) loadHospitals(location);
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(() => {
    if (!location) return;
    setRefreshing(true);
    loadHospitals(location);
  }, [location, loadHospitals]);

  // ─── 3. 체류 기간 추천 ───────────────────────────────

  const getRecommendations = () => {
    const days = parseInt(stayDays, 10);
    if (!days || days <= 0) return [];
    if (days <= 3) return STAY_RECOMMENDATIONS[3];
    if (days <= 5) return STAY_RECOMMENDATIONS[5];
    if (days <= 7) return STAY_RECOMMENDATIONS[7];
    return STAY_RECOMMENDATIONS[14];
  };

  // ─── 4. 거리 포맷 ───────────────────────────────────

  const formatDistance = (km?: number) => {
    if (km == null) return '';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  // ─── 5. 병원 카드 (외국인 친화 뱃지 포함) ────────────

  const renderHospitalCard = ({ item }: { item: Hospital }) => (
    <TouchableOpacity
      style={styles.hospitalCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('HospitalDetail', { hospitalId: item.hospital_id })}
    >
      <View style={styles.cardThumb}>
        <Text style={{ fontSize: 32 }}>{'\u{1F3E5}'}</Text>
        {/* 당일 예약 가능 뱃지 */}
        <View style={styles.availableBadge}>
          <Text style={styles.availableBadgeText}>{t('home.bookableToday')}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {/* 병원명 */}
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name_en || item.name}
        </Text>

        {/* 외국인 친화 뱃지들 */}
        <View style={styles.badgeRow}>
          {item.english_available && (
            <View style={styles.foreignBadge}>
              <Text style={styles.foreignBadgeText}>{'\u{1F1FA}\u{1F1F8}'} {t('search.englishAvailable')}</Text>
            </View>
          )}
          {item.has_interpreter && (
            <View style={[styles.foreignBadge, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.foreignBadgeText, { color: '#1D4ED8' }]}>{t('search.interpreterAvailable')}</Text>
            </View>
          )}
        </View>

        {/* 별점 + 리뷰 + 거리 */}
        <View style={styles.metaRow}>
          <Stars rating={item.avg_rating} />
          <Text style={styles.ratingNum}>{item.avg_rating?.toFixed(1) || '-'}</Text>
          <Text style={styles.dot}>{'\u00B7'}</Text>
          <Text style={styles.reviewCount}>{item.review_count} reviews</Text>
          {item.distance_km != null && (
            <>
              <Text style={styles.dot}>{'\u00B7'}</Text>
              <Text style={styles.distance}>{formatDistance(item.distance_km)}</Text>
            </>
          )}
        </View>

        {/* 예약 버튼 */}
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('Booking', {
            hospitalId: item.hospital_id,
            hospitalName: item.name_en || item.name,
          })}
        >
          <Text style={styles.bookBtnText}>{t('hospital.bookNow')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // ─── 6. 리스트 헤더 ──────────────────────────────────

  const ListHeader = () => (
    <View>
      {/* K-Beauty 헤더 */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>{t('home.header')}</Text>
        <Text style={styles.heroSubtitle}>{t('home.subHeader')}</Text>
      </View>

      {/* 환율 표시 카드 */}
      <View style={styles.rateCard}>
        <Text style={styles.rateIcon}>{'\u{1F4B1}'}</Text>
        <View style={styles.rateInfo}>
          <Text style={styles.rateLabel}>{t('home.currencyRate')}</Text>
          <Text style={styles.rateValue}>{getRateDisplay()}</Text>
        </View>
      </View>

      {/* 인기 카테고리 */}
      <Text style={styles.sectionTitle}>{t('home.popularCategories')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryBar}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key || 'all'}
            style={styles.categoryChip}
            onPress={() => navigation.navigate('HospitalSearch' as any)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={styles.categoryLabel}>{t(cat.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 체류 기간 기반 추천 */}
      <View style={styles.staySection}>
        <Text style={styles.sectionTitle}>{t('home.stayPlanner')}</Text>
        <Text style={styles.stayQuestion}>{t('home.stayQuestion')}</Text>
        <View style={styles.stayInputRow}>
          <TextInput
            style={styles.stayInput}
            placeholder="3"
            placeholderTextColor="#D1D5DB"
            keyboardType="number-pad"
            value={stayDays}
            onChangeText={(v) => {
              setStayDays(v);
              setShowRecommendations(!!v && parseInt(v, 10) > 0);
            }}
            maxLength={2}
          />
          <Text style={styles.stayUnit}>days</Text>
        </View>

        {showRecommendations && (
          <View style={styles.recommendBox}>
            <Text style={styles.recommendTitle}>
              {t('home.stayRecommendTitle', { days: stayDays })}
            </Text>
            {getRecommendations().map((item, idx) => (
              <View key={idx} style={styles.recommendItem}>
                <Text style={styles.recommendDot}>{'\u2022'}</Text>
                <Text style={styles.recommendText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Top Rated 섹션 제목 */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        {t('home.topRated')}
      </Text>
      {!loading && (
        <Text style={styles.resultCount}>
          {hospitals.length > 0
            ? `${hospitals.length} ${t('search.results', { count: hospitals.length }).split(' ').slice(-2).join(' ')}`
            : t('search.noResults')}
        </Text>
      )}
    </View>
  );

  // ─── 7. 렌더링 ──────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(item) => String(item)}
          renderItem={() => <SkeletonCard />}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={hospitals}
          keyExtractor={(item) => String(item.hospital_id)}
          renderItem={renderHospitalCard}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#E8772E']}
              tintColor="#E8772E"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 48 }}>{'\u{1F50D}'}</Text>
              <Text style={styles.emptyTitle}>{t('search.noResults')}</Text>
              <Text style={styles.emptySubtitle}>{t('search.noResultsHint')}</Text>
            </View>
          }
        />
      )}

      {/* 하단: 지도 보기 */}
      {location && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.mapBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Map', {
              lat: location.lat, lng: location.lng,
            })}
          >
            <Text style={styles.mapBtnIcon}>{'\u{1F5FA}\u{FE0F}'}</Text>
            <Text style={styles.mapBtnText}>{t('home.seeOnMap')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── 스타일 ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  skeleton: { backgroundColor: '#E5E7EB', borderRadius: 8 },

  // 히어로 헤더
  heroSection: { paddingTop: 20, paddingBottom: 16, paddingHorizontal: 4 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#1F2937' },
  heroSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, fontWeight: '500' },

  // 환율 카드
  rateCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: '#FFF7ED', borderRadius: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#FED7AA',
  },
  rateIcon: { fontSize: 24, marginRight: 12 },
  rateInfo: { flex: 1 },
  rateLabel: { fontSize: 11, fontWeight: '600', color: '#9A3412', textTransform: 'uppercase' },
  rateValue: { fontSize: 16, fontWeight: '700', color: '#C2410C', marginTop: 2 },

  // 섹션 제목
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: '#1F2937',
    paddingHorizontal: 4, marginBottom: 12,
  },

  // 카테고리
  categoryBar: { paddingHorizontal: 4, gap: 10, paddingBottom: 20 },
  categoryChip: {
    alignItems: 'center', justifyContent: 'center',
    width: 80, height: 80, borderRadius: 16,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  categoryIcon: { fontSize: 24, marginBottom: 4 },
  categoryLabel: { fontSize: 11, fontWeight: '600', color: '#4B5563', textAlign: 'center' },

  // 체류 기간
  staySection: { marginBottom: 8 },
  stayQuestion: { fontSize: 13, color: '#6B7280', paddingHorizontal: 4, marginBottom: 10 },
  stayInputRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 12,
  },
  stayInput: {
    width: 60, height: 44, backgroundColor: '#FFFFFF', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB', textAlign: 'center',
    fontSize: 18, fontWeight: '700', color: '#1F2937',
  },
  stayUnit: { fontSize: 15, fontWeight: '600', color: '#6B7280', marginLeft: 8 },

  recommendBox: {
    backgroundColor: '#FFF7ED', borderRadius: 12, padding: 16,
    marginHorizontal: 4, borderWidth: 1, borderColor: '#FED7AA',
  },
  recommendTitle: { fontSize: 14, fontWeight: '700', color: '#9A3412', marginBottom: 8 },
  recommendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  recommendDot: { fontSize: 14, color: '#E8772E', marginRight: 8 },
  recommendText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },

  // 결과 건수
  resultCount: {
    fontSize: 13, fontWeight: '600', color: '#9CA3AF',
    paddingHorizontal: 4, marginBottom: 8,
  },

  // 병원 카드
  hospitalCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardThumb: {
    width: 88, height: 112, borderRadius: 12, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },

  // 당일예약 뱃지
  availableBadge: {
    position: 'absolute', bottom: 6, left: 4, right: 4,
    backgroundColor: '#059669', borderRadius: 6, paddingVertical: 3,
    alignItems: 'center',
  },
  availableBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },

  // 외국인 친화 뱃지
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  foreignBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    backgroundColor: '#D1FAE5',
  },
  foreignBadgeText: { fontSize: 10, fontWeight: '600', color: '#065F46' },

  // 메타 정보
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 3 },
  ratingNum: { fontSize: 13, fontWeight: '700', color: '#E8772E', marginLeft: 2 },
  dot: { fontSize: 10, color: '#D1D5DB', marginHorizontal: 2 },
  reviewCount: { fontSize: 12, color: '#6B7280' },
  distance: { fontSize: 12, fontWeight: '600', color: '#1E5FA8' },

  bookBtn: {
    marginTop: 10, alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#E8772E',
  },
  bookBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  // 빈 상태
  emptyContainer: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },

  // 하단 지도 버튼
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
    alignItems: 'center',
  },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28,
    backgroundColor: '#E8772E',
    ...Platform.select({
      ios: { shadowColor: '#E8772E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  mapBtnIcon: { fontSize: 18 },
  mapBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
