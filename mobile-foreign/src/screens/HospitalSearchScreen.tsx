/**
 * 병원 검색 화면
 * 텍스트 검색 + 카테고리 필터 + 외국인 친화 필터 + 정렬
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Platform,
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

const CATEGORIES = [
  { key: '',           labelKey: 'categories.all' },
  { key: '\uC131\uD615\uC678\uACFC', labelKey: 'categories.plastic' },
  { key: '\uD53C\uBD80\uACFC',     labelKey: 'categories.dermatology' },
  { key: '\uCE58\uACFC',         labelKey: 'categories.dental' },
  { key: '\uC548\uACFC',         labelKey: 'categories.eye' },
];

// ─── 별점 ──────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: 12, color: i <= rounded ? '#E8772E' : '#D1D5DB' }}>
          {'\u2605'}
        </Text>
      ))}
    </View>
  );
}

export default function HospitalSearchScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { convert } = useCurrency();

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [foreignOnly, setForeignOnly] = useState(false);

  const locationRef = useRef(location);
  locationRef.current = location;

  // GPS 위치
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coords = { lat: 37.4979, lng: 127.0276 };
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        } catch { /* 기본값 */ }
      }
      setLocation(coords);
    })();
  }, []);

  // 병원 검색
  const loadHospitals = useCallback(async (
    coords: { lat: number; lng: number },
    category: string,
    query: string,
  ) => {
    try {
      const params: Record<string, string | number> = {
        lat: coords.lat, lng: coords.lng, radius: 10, limit: 50,
      };
      if (category) params.category = category;
      if (query.trim()) params.q = query.trim();

      const { data } = await client.get('/hospitals/search', { params });
      setHospitals(data.data || []);
    } catch {
      // 에러 무시
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (location) loadHospitals(location, selectedCategory, searchText);
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  // 검색 실행
  const handleSearch = useCallback(() => {
    if (!locationRef.current) return;
    setLoading(true);
    loadHospitals(locationRef.current, selectedCategory, searchText);
  }, [selectedCategory, searchText, loadHospitals]);

  // 카테고리 변경
  const handleCategoryChange = useCallback((cat: string) => {
    setSelectedCategory(cat);
    if (locationRef.current) {
      setLoading(true);
      loadHospitals(locationRef.current, cat, searchText);
    }
  }, [searchText, loadHospitals]);

  const onRefresh = useCallback(() => {
    if (!location) return;
    setRefreshing(true);
    loadHospitals(location, selectedCategory, searchText);
  }, [location, selectedCategory, searchText, loadHospitals]);

  // 거리 포맷
  const formatDistance = (km?: number) => {
    if (km == null) return '';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  // 필터된 목록
  const filtered = foreignOnly
    ? hospitals.filter((h) => h.english_available || h.has_interpreter)
    : hospitals;

  // 병원 카드
  const renderCard = ({ item }: { item: Hospital }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('HospitalDetail', { hospitalId: item.hospital_id })}
    >
      <View style={styles.cardThumb}>
        <Text style={{ fontSize: 28 }}>{'\u{1F3E5}'}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name_en || item.name}
        </Text>

        {/* 외국인 뱃지 */}
        <View style={styles.badgeRow}>
          {item.english_available && (
            <View style={styles.enBadge}>
              <Text style={styles.enBadgeText}>{'\u{1F1FA}\u{1F1F8}'} EN</Text>
            </View>
          )}
          {item.has_interpreter && (
            <View style={styles.intBadge}>
              <Text style={styles.intBadgeText}>{t('search.interpreterAvailable')}</Text>
            </View>
          )}
          {item.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>{'\u2713'} {t('hospital.verified')}</Text>
            </View>
          )}
        </View>

        {/* 별점 + 거리 */}
        <View style={styles.metaRow}>
          <Stars rating={item.avg_rating} />
          <Text style={styles.ratingText}>{item.avg_rating?.toFixed(1)}</Text>
          <Text style={styles.dot}>{'\u00B7'}</Text>
          <Text style={styles.reviewText}>{item.review_count} reviews</Text>
          {item.distance_km != null && (
            <>
              <Text style={styles.dot}>{'\u00B7'}</Text>
              <Text style={styles.distanceText}>{formatDistance(item.distance_km)}</Text>
            </>
          )}
        </View>

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 검색바 */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('search.searchPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {/* 카테고리 + 외국인 필터 */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.key || 'all'}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => {
            const isActive = selectedCategory === item.key;
            return (
              <TouchableOpacity
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => handleCategoryChange(item.key)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {t(item.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 외국인 친화 토글 */}
      <TouchableOpacity
        style={[styles.foreignToggle, foreignOnly && styles.foreignToggleActive]}
        onPress={() => setForeignOnly(!foreignOnly)}
      >
        <Text style={[styles.foreignToggleText, foreignOnly && styles.foreignToggleTextActive]}>
          {'\u{1F30F}'} {t('search.foreignFriendly')}
        </Text>
      </TouchableOpacity>

      {/* 결과 건수 */}
      <Text style={styles.resultCount}>
        {t('search.results', { count: filtered.length })}
      </Text>

      {/* 병원 목록 */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.hospital_id)}
        renderItem={renderCard}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E8772E']} tintColor="#E8772E" />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>{'\u{1F50D}'}</Text>
              <Text style={styles.emptyTitle}>{t('search.noResults')}</Text>
              <Text style={styles.emptyHint}>{t('search.noResultsHint')}</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // 검색바
  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    marginTop: 12, marginBottom: 12, paddingHorizontal: 14, height: 46,
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },

  // 필터
  filterRow: { marginBottom: 10 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#E8772E', borderColor: '#E8772E' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  chipTextActive: { color: '#FFFFFF' },

  foreignToggle: {
    alignSelf: 'flex-start', marginLeft: 16, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  foreignToggleActive: { backgroundColor: '#D1FAE5', borderColor: '#059669' },
  foreignToggleText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  foreignToggleTextActive: { color: '#065F46' },

  resultCount: {
    fontSize: 13, fontWeight: '600', color: '#9CA3AF',
    marginLeft: 20, marginBottom: 8,
  },

  // 카드
  card: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  cardThumb: {
    width: 72, height: 90, borderRadius: 10, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  enBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, backgroundColor: '#D1FAE5' },
  enBadgeText: { fontSize: 9, fontWeight: '700', color: '#065F46' },
  intBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, backgroundColor: '#DBEAFE' },
  intBadgeText: { fontSize: 9, fontWeight: '600', color: '#1D4ED8' },
  verifiedBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, backgroundColor: '#EBF2FA' },
  verifiedBadgeText: { fontSize: 9, fontWeight: '600', color: '#1E5FA8' },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#E8772E', marginLeft: 2 },
  dot: { fontSize: 10, color: '#D1D5DB', marginHorizontal: 2 },
  reviewText: { fontSize: 11, color: '#6B7280' },
  distanceText: { fontSize: 11, fontWeight: '600', color: '#1E5FA8' },

  bookBtn: {
    marginTop: 8, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6,
    backgroundColor: '#E8772E',
  },
  bookBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  // 빈 상태
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12 },
  emptyHint: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
});
