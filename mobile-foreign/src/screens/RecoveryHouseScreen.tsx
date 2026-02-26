/**
 * 회복 숙소 화면
 *
 * 지도 뷰 + 숙소 카드 리스트 + 필터 기능을 제공한다.
 * react-native-maps로 마커를 표시하고, 클릭 시 미니 카드 팝업을 띄운다.
 *
 * 구성:
 *   1. 지도 뷰 (MapView + 마커)
 *   2. 필터 바 (간호 서비스, 공항 셔틀, 영어 가능)
 *   3. 숙소 카드 리스트 (사진 슬라이더, 편의시설, 별점, 요금, 예약 문의)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Linking, Dimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import MapView, { Marker, Callout } from 'react-native-maps';
import client from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 260;
const PHOTO_SLIDER_WIDTH = SCREEN_WIDTH - 32; // 좌우 패딩 16 * 2
const PHOTO_ITEM_WIDTH = PHOTO_SLIDER_WIDTH;

// ─── 타입 정의 ────────────────────────────────────────

interface RecoveryHouse {
  house_id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  price_per_night: number;
  amenities: string[];
  photos: string[];
  contact_phone: string | null;
  contact_url: string | null;
  rating: number;
  review_count: number;
  distance_km?: number;
}

// 편의시설 아이콘 매핑
const AMENITY_ICONS: Record<string, string> = {
  WiFi: '\u{1F4F6}',
  wifi: '\u{1F4F6}',
  'Nursing Care': '\u{1FA7A}',
  'nursing_care': '\u{1FA7A}',
  'Airport Shuttle': '\u{1F68C}',
  'airport_shuttle': '\u{1F68C}',
  'English Staff': '\u{1F30D}',
  'english_staff': '\u{1F30D}',
  'Meal Service': '\u{1F371}',
  'meal_service': '\u{1F371}',
  'Laundry': '\u{1F9FA}',
  'laundry': '\u{1F9FA}',
  'Parking': '\u{1F17F}\uFE0F',
  'parking': '\u{1F17F}\uFE0F',
  'Post-op Care': '\u{1F489}',
  'post_op_care': '\u{1F489}',
  'Korean Lessons': '\u{1F4DA}',
  'korean_lessons': '\u{1F4DA}',
};

// 필터 정의
interface FilterOption {
  key: string;
  labelKey: string;
  icon: string;
  matchValues: string[]; // amenities 배열에서 매칭할 값들
}

const FILTERS: FilterOption[] = [
  {
    key: 'nursing',
    labelKey: 'recoveryHouse.filterNursing',
    icon: '\u{1FA7A}',
    matchValues: ['Nursing Care', 'nursing_care', 'Post-op Care', 'post_op_care'],
  },
  {
    key: 'shuttle',
    labelKey: 'recoveryHouse.filterShuttle',
    icon: '\u{1F68C}',
    matchValues: ['Airport Shuttle', 'airport_shuttle'],
  },
  {
    key: 'english',
    labelKey: 'recoveryHouse.filterEnglish',
    icon: '\u{1F30D}',
    matchValues: ['English Staff', 'english_staff'],
  },
];

// 강남역 기본 좌표 (서울 중심)
const DEFAULT_REGION = {
  latitude: 37.4979,
  longitude: 127.0276,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function RecoveryHouseScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { convert } = useCurrency();
  const mapRef = useRef<MapView>(null);

  // ─── 상태 ────────────────────────────────────────────
  const [houses, setHouses] = useState<RecoveryHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null);

  // ─── API 호출: 숙소 목록 ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/guide/recovery-houses', {
          params: {
            lat: DEFAULT_REGION.latitude,
            lng: DEFAULT_REGION.longitude,
            lang: language,
          },
        });
        if (data.success) {
          setHouses(data.data || []);
        }
      } catch {
        // 에러 무시
      } finally {
        setLoading(false);
      }
    })();
  }, [language]);

  // ─── 필터 토글 ────────────────────────────────────────
  const toggleFilter = (key: string) => {
    const updated = new Set(activeFilters);
    if (updated.has(key)) {
      updated.delete(key);
    } else {
      updated.add(key);
    }
    setActiveFilters(updated);
  };

  // ─── 필터 적용된 숙소 목록 ────────────────────────────
  const filteredHouses = houses.filter((house) => {
    if (activeFilters.size === 0) return true;

    // 모든 활성 필터를 만족해야 함
    for (const filterKey of activeFilters) {
      const filterDef = FILTERS.find((f) => f.key === filterKey);
      if (!filterDef) continue;

      const hasAmenity = filterDef.matchValues.some((val) =>
        house.amenities.some((a) => a.toLowerCase() === val.toLowerCase())
      );
      if (!hasAmenity) return false;
    }
    return true;
  });

  // ─── 마커 클릭 → 카드로 스크롤 ───────────────────────
  const scrollViewRef = useRef<ScrollView>(null);
  const cardPositions = useRef<Record<number, number>>({});

  const onMarkerPress = (houseId: number) => {
    setSelectedHouseId(houseId);
    // 카드 위치로 스크롤
    const yOffset = cardPositions.current[houseId];
    if (yOffset != null && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: yOffset + MAP_HEIGHT, animated: true });
    }
  };

  // ─── 별점 렌더링 ──────────────────────────────────────
  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += i < full ? '\u2605' : '\u2606';
    }
    return stars;
  };

  // ─── 예약 문의 처리 ──────────────────────────────────
  const handleContactPress = (house: RecoveryHouse) => {
    if (house.contact_url) {
      Linking.openURL(house.contact_url).catch(() => {});
    } else if (house.contact_phone) {
      Linking.openURL(`tel:${house.contact_phone}`).catch(() => {});
    }
  };

  // ─── 편의시설 아이콘 가져오기 ─────────────────────────
  const getAmenityIcon = (amenity: string): string => {
    return AMENITY_ICONS[amenity] || '\u2705';
  };

  /* ================================================================
   *  렌더링
   * ================================================================ */

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E8772E" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('recoveryHouse.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('recoveryHouse.subtitle')}</Text>
      </View>

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>

        {/* ─── 1. 지도 뷰 ─────────────────────────────── */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={DEFAULT_REGION}
            showsUserLocation
            showsMyLocationButton
          >
            {filteredHouses.map((house) => (
              <Marker
                key={house.house_id}
                coordinate={{ latitude: house.lat, longitude: house.lng }}
                pinColor={selectedHouseId === house.house_id ? '#E8772E' : '#FF6B6B'}
                onPress={() => onMarkerPress(house.house_id)}
              >
                {/* 미니 카드 팝업 (Callout) */}
                <Callout tooltip>
                  <View style={styles.calloutContainer}>
                    <Text style={styles.calloutName} numberOfLines={1}>{house.name}</Text>
                    <Text style={styles.calloutPrice}>
                      {convert(house.price_per_night, true)}/{t('recoveryHouse.perNight')}
                    </Text>
                    <View style={styles.calloutRating}>
                      <Text style={styles.calloutStars}>{renderStars(house.rating)}</Text>
                      <Text style={styles.calloutRatingText}>{house.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>

          {/* 지도 위 숙소 개수 배지 */}
          <View style={styles.mapBadge}>
            <Text style={styles.mapBadgeText}>
              {t('recoveryHouse.countBadge', { count: filteredHouses.length })}
            </Text>
          </View>
        </View>

        {/* ─── 2. 필터 바 ──────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {FILTERS.map((filter) => {
            const isActive = activeFilters.has(filter.key);
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => toggleFilter(filter.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.filterIcon}>{filter.icon}</Text>
                <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                  {t(filter.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── 3. 숙소 카드 리스트 ────────────────────── */}
        <View style={styles.listSection}>
          {filteredHouses.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>{'\u{1F3E8}'}</Text>
              <Text style={styles.emptyText}>{t('recoveryHouse.noResults')}</Text>
              <Text style={styles.emptyHint}>{t('recoveryHouse.noResultsHint')}</Text>
            </View>
          ) : (
            filteredHouses.map((house, index) => (
              <View
                key={house.house_id}
                style={[
                  styles.houseCard,
                  selectedHouseId === house.house_id && styles.houseCardSelected,
                ]}
                onLayout={(e) => {
                  cardPositions.current[house.house_id] = e.nativeEvent.layout.y;
                }}
              >
                {/* 사진 슬라이더 */}
                {house.photos && house.photos.length > 0 ? (
                  <FlatList
                    data={house.photos}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(_, i) => `photo-${house.house_id}-${i}`}
                    renderItem={({ item: photoUrl }) => (
                      <View style={styles.photoSlide}>
                        {/* 사진 URL이 있으면 배경색 + 아이콘으로 표시 (Image 미사용 시 대체) */}
                        <View style={styles.photoPlaceholder}>
                          <Text style={styles.photoPlaceholderIcon}>{'\u{1F3E8}'}</Text>
                          <Text style={styles.photoPlaceholderText}>{house.name}</Text>
                        </View>
                      </View>
                    )}
                    style={styles.photoSlider}
                  />
                ) : (
                  <View style={styles.photoSlide}>
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoPlaceholderIcon}>{'\u{1F3E8}'}</Text>
                      <Text style={styles.photoPlaceholderText}>{house.name}</Text>
                    </View>
                  </View>
                )}

                {/* 카드 본문 */}
                <View style={styles.cardBody}>
                  {/* 이름 + 거리 */}
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardName} numberOfLines={1}>{house.name}</Text>
                    {house.distance_km != null && (
                      <Text style={styles.cardDistance}>
                        {'\u{1F4CD}'} {house.distance_km < 1
                          ? `${Math.round(house.distance_km * 1000)}m`
                          : `${house.distance_km.toFixed(1)}km`}
                      </Text>
                    )}
                  </View>

                  {/* 주소 */}
                  <Text style={styles.cardAddress} numberOfLines={1}>{house.address}</Text>

                  {/* 설명 */}
                  {house.description ? (
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {house.description}
                    </Text>
                  ) : null}

                  {/* 가격: KRW + 선택 통화 */}
                  <View style={styles.priceRow}>
                    <Text style={styles.priceMain}>
                      {convert(house.price_per_night, true)}
                    </Text>
                    <Text style={styles.priceUnit}>/{t('recoveryHouse.perNight')}</Text>
                  </View>

                  {/* 편의시설 아이콘 */}
                  <View style={styles.amenityRow}>
                    {house.amenities.map((amenity) => (
                      <View key={amenity} style={styles.amenityItem}>
                        <Text style={styles.amenityIcon}>{getAmenityIcon(amenity)}</Text>
                        <Text style={styles.amenityLabel} numberOfLines={1}>{amenity}</Text>
                      </View>
                    ))}
                  </View>

                  {/* 별점 + 리뷰 수 */}
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingStars}>{renderStars(house.rating)}</Text>
                    <Text style={styles.ratingValue}>{house.rating.toFixed(1)}</Text>
                    <Text style={styles.reviewCount}>
                      ({house.review_count} {t('recoveryHouse.reviews')})
                    </Text>
                  </View>

                  {/* 예약 문의 버튼 */}
                  <TouchableOpacity
                    style={styles.contactBtn}
                    activeOpacity={0.7}
                    onPress={() => handleContactPress(house)}
                  >
                    <Text style={styles.contactBtnIcon}>{'\u{1F4AC}'}</Text>
                    <Text style={styles.contactBtnText}>{t('recoveryHouse.contactBtn')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 하단 여백 */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================================================================
 *  스타일
 * ================================================================ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // 로딩
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#9CA3AF' },

  // 헤더
  header: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },

  // ─── 지도 ──────────────────────────────────────────
  mapContainer: { position: 'relative' },
  map: { width: '100%', height: MAP_HEIGHT },

  // 미니 카드 팝업 (Callout)
  calloutContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 12, minWidth: 160,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  calloutName: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  calloutPrice: { fontSize: 13, fontWeight: '600', color: '#E8772E', marginBottom: 4 },
  calloutRating: { flexDirection: 'row', alignItems: 'center' },
  calloutStars: { fontSize: 12, color: '#F59E0B', marginRight: 4 },
  calloutRatingText: { fontSize: 12, color: '#6B7280' },

  // 지도 위 배지
  mapBadge: {
    position: 'absolute', top: 12, left: 16,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  mapBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  // ─── 필터 바 ──────────────────────────────────────
  filterBar: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#E8772E', borderColor: '#E8772E' },
  filterIcon: { fontSize: 14, marginRight: 6 },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  filterLabelActive: { color: '#FFFFFF' },

  // ─── 숙소 카드 리스트 ─────────────────────────────
  listSection: { paddingHorizontal: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#4B5563' },
  emptyHint: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

  houseCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  houseCardSelected: { borderColor: '#E8772E', borderWidth: 2 },

  // 사진 슬라이더
  photoSlider: { width: '100%', height: 160 },
  photoSlide: { width: PHOTO_ITEM_WIDTH, height: 160 },
  photoPlaceholder: {
    flex: 1, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  photoPlaceholderIcon: { fontSize: 40, marginBottom: 4 },
  photoPlaceholderText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },

  // 카드 본문
  cardBody: { padding: 16 },
  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardName: { fontSize: 17, fontWeight: '800', color: '#1F2937', flex: 1, marginRight: 8 },
  cardDistance: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  cardAddress: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  cardDescription: { fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 19 },

  // 가격
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
  priceMain: { fontSize: 18, fontWeight: '800', color: '#E8772E' },
  priceUnit: { fontSize: 12, color: '#9CA3AF', marginLeft: 2 },

  // 편의시설
  amenityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  amenityItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  amenityIcon: { fontSize: 14, marginRight: 4 },
  amenityLabel: { fontSize: 11, fontWeight: '600', color: '#16A34A', maxWidth: 80 },

  // 별점
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  ratingStars: { fontSize: 14, color: '#F59E0B', marginRight: 6 },
  ratingValue: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginRight: 4 },
  reviewCount: { fontSize: 12, color: '#9CA3AF' },

  // 예약 문의 버튼
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 16, paddingVertical: 14,
    backgroundColor: '#E8772E', borderRadius: 12,
  },
  contactBtnIcon: { fontSize: 16, marginRight: 8 },
  contactBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
