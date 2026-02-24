/**
 * 홈 화면
 * GPS 위치 기반 주변 병원 목록 + 카테고리 필터 + 지도 보기
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, Pressable, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import client from '../api/client';
import { Hospital, RootStackParamList } from '../types';

type Nav = StackNavigationProp<RootStackParamList>;

// ─── 카테고리 목록 ────────────────────────────────────

const CATEGORIES = [
  { key: '',           label: '전체',     icon: '🏥' },
  { key: '성형외과',   label: '성형외과', icon: '✨' },
  { key: '피부과',     label: '피부과',   icon: '🧴' },
  { key: '치과',       label: '치과',     icon: '🦷' },
  { key: '안과',       label: '안과',     icon: '👁️' },
];

// ─── 스켈레톤 카드 ────────────────────────────────────

function SkeletonCard() {
  return (
    <View style={styles.card}>
      {/* 썸네일 스켈레톤 */}
      <View style={[styles.cardThumb, styles.skeleton]} />

      <View style={styles.cardBody}>
        {/* 이름 스켈레톤 */}
        <View style={[styles.skeleton, { width: 140, height: 16, borderRadius: 4 }]} />
        {/* 카테고리 스켈레톤 */}
        <View style={[styles.skeleton, { width: 60, height: 12, borderRadius: 4, marginTop: 6 }]} />
        {/* 별점 스켈레톤 */}
        <View style={[styles.skeleton, { width: 100, height: 12, borderRadius: 4, marginTop: 8 }]} />
        {/* 거리 스켈레톤 */}
        <View style={[styles.skeleton, { width: 80, height: 12, borderRadius: 4, marginTop: 6 }]} />
      </View>
    </View>
  );
}

// ─── 별점 렌더링 ──────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  const stars: React.ReactNode[] = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Text key={i} style={{ fontSize: 13, color: i <= rounded ? '#E8772E' : '#D1D5DB' }}>
        ★
      </Text>
    );
  }
  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
}

// ─── 메인 컴포넌트 ────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

  // 위치 상태
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('위치 확인 중...');
  const [permissionDenied, setPermissionDenied] = useState(false);

  // 데이터 상태
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  // 위치 ref (카테고리 변경 콜백에서 최신값 참조용)
  const locationRef = useRef(location);
  locationRef.current = location;

  // ─── 1. GPS 위치 획득 ───────────────────────────────

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setLocation(coords);

        // 역 지오코딩으로 위치명 가져오기
        const [addr] = await Location.reverseGeocodeAsync({
          latitude: coords.lat,
          longitude: coords.lng,
        });
        if (addr) {
          const name = [addr.district, addr.street].filter(Boolean).join(' ') || addr.city || '현재 위치';
          setLocationName(name);
        }
      } catch {
        // 위치 획득 실패 → 기본 좌표 (강남역)
        setLocation({ lat: 37.4979, lng: 127.0276 });
        setLocationName('강남역 부근');
      }
    })();
  }, []);

  // ─── 2. 병원 목록 불러오기 ──────────────────────────

  const loadHospitals = useCallback(async (
    coords: { lat: number; lng: number },
    category: string,
  ) => {
    try {
      const params: Record<string, string | number> = {
        lat: coords.lat,
        lng: coords.lng,
        radius: 10,
        limit: 30,
      };
      if (category) params.category = category;

      const { data } = await client.get('/hospitals/search', { params });
      setHospitals(data.data || []);
    } catch {
      // 에러 시 빈 배열 유지
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 위치 획득 완료 시 첫 로드
  useEffect(() => {
    if (location) {
      loadHospitals(location, selectedCategory);
    }
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  // 카테고리 변경 시 재요청
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    if (locationRef.current) {
      setLoading(true);
      loadHospitals(locationRef.current, category);
    }
  }, [loadHospitals]);

  // 풀다운 새로고침
  const onRefresh = useCallback(() => {
    if (!location) return;
    setRefreshing(true);
    loadHospitals(location, selectedCategory);
  }, [location, selectedCategory, loadHospitals]);

  // ─── 3. 거리 포맷 ──────────────────────────────────

  const formatDistance = (km?: number) => {
    if (km == null) return '';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  // ─── 4. 병원 카드 렌더링 ───────────────────────────

  const renderHospitalCard = ({ item }: { item: Hospital }) => {
    const review = item.latest_review;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('HospitalDetail', { hospitalId: item.hospital_id })}
      >
        {/* 썸네일 */}
        <View style={styles.cardThumb}>
          <Text style={{ fontSize: 32 }}>🏥</Text>
        </View>

        <View style={styles.cardBody}>
          {/* 병원명 + 카테고리 배지 */}
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          </View>

          {/* 별점 + 리뷰 수 + 거리 */}
          <View style={styles.cardMetaRow}>
            <Stars rating={item.avg_rating} />
            <Text style={styles.cardRatingNum}>{item.avg_rating?.toFixed(1) || '-'}</Text>
            <Text style={styles.cardDot}>·</Text>
            <Text style={styles.cardReviewCount}>리뷰 {item.review_count}</Text>
            {item.distance_km != null && (
              <>
                <Text style={styles.cardDot}>·</Text>
                <Text style={styles.cardDistance}>{formatDistance(item.distance_km)}</Text>
              </>
            )}
          </View>

          {/* 최근 리뷰 한 줄 미리보기 */}
          {review ? (
            <View style={styles.reviewPreview}>
              <Text style={styles.reviewPreviewText} numberOfLines={1}>
                "{review.content}"
              </Text>
              <Text style={styles.reviewPreviewAuthor}>- {review.author_name}</Text>
            </View>
          ) : (
            <Text style={styles.noReviewText}>아직 리뷰가 없습니다</Text>
          )}

          {/* 예약하기 버튼 */}
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => navigation.navigate('Booking', {
              hospitalId: item.hospital_id,
              hospitalName: item.name,
            })}
          >
            <Text style={styles.bookBtnText}>예약하기</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── 5. 헤더 컴포넌트 (FlatList용) ─────────────────

  const ListHeader = () => (
    <View>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 주변 병원 찾기</Text>
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationName} numberOfLines={1}>{locationName}</Text>
        </View>
      </View>

      {/* 카테고리 가로 스크롤 */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.categoryBar}
        renderItem={({ item }) => {
          const isActive = selectedCategory === item.key;
          return (
            <TouchableOpacity
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => handleCategoryChange(item.key)}
            >
              <Text style={styles.categoryChipIcon}>{item.icon}</Text>
              <Text style={[styles.categoryChipLabel, isActive && styles.categoryChipLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* 결과 건수 */}
      {!loading && (
        <Text style={styles.resultCount}>
          {hospitals.length > 0
            ? `주변 병원 ${hospitals.length}곳`
            : '주변에 병원이 없습니다'}
        </Text>
      )}
    </View>
  );

  // ─── 6. 렌더링 ─────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {loading ? (
        // 스켈레톤 로딩
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(item) => String(item)}
          renderItem={() => <SkeletonCard />}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        // 실제 데이터
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
              colors={['#1E5FA8']}
              tintColor="#1E5FA8"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={styles.emptyTitle}>주변에 병원이 없습니다</Text>
              <Text style={styles.emptySubtitle}>검색 범위를 넓히거나 다른 카테고리를 선택해보세요</Text>
            </View>
          }
        />
      )}

      {/* 하단 고정: 지도로 보기 버튼 */}
      {location && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.mapBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Map', {
              lat: location.lat,
              lng: location.lng,
              category: selectedCategory || undefined,
            })}
          >
            <Text style={styles.mapBtnIcon}>🗺️</Text>
            <Text style={styles.mapBtnText}>지도로 보기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 위치 권한 거부 모달 */}
      <Modal
        visible={permissionDenied}
        transparent
        animationType="fade"
        onRequestClose={() => setPermissionDenied(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPermissionDenied(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>📍</Text>
            <Text style={styles.modalTitle}>위치 권한이 필요합니다</Text>
            <Text style={styles.modalDesc}>
              주변 병원을 검색하려면 위치 접근 권한이 필요합니다.{'\n'}
              설정에서 위치 권한을 허용해주세요.
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => {
                  setPermissionDenied(false);
                  // 기본 좌표로 로드
                  setLocation({ lat: 37.4979, lng: 127.0276 });
                  setLocationName('강남역 부근 (기본 위치)');
                }}
              >
                <Text style={styles.modalBtnSecondaryText}>기본 위치 사용</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                onPress={async () => {
                  setPermissionDenied(false);
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
                  }
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>권한 허용하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── 스타일 ───────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // 스켈레톤
  skeleton: { backgroundColor: '#E5E7EB', borderRadius: 8 },

  // ─── 헤더 ───────────────────────────────────────────
  header: { paddingTop: 16, paddingBottom: 4, paddingHorizontal: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  locationIcon: { fontSize: 14, marginRight: 4 },
  locationName: { fontSize: 14, color: '#6B7280', fontWeight: '500', flex: 1 },

  // ─── 카테고리 바 ────────────────────────────────────
  categoryBar: { paddingVertical: 16, paddingHorizontal: 4, gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  categoryChipActive: { backgroundColor: '#1E5FA8', borderColor: '#1E5FA8' },
  categoryChipIcon: { fontSize: 16 },
  categoryChipLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  categoryChipLabelActive: { color: '#FFFFFF' },

  // ─── 결과 건수 ──────────────────────────────────────
  resultCount: {
    fontSize: 13, fontWeight: '600', color: '#9CA3AF',
    paddingHorizontal: 4, marginBottom: 8,
  },

  // ─── 병원 카드 ──────────────────────────────────────
  card: {
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

  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1F2937', flex: 1 },
  categoryBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: '#EBF2FA',
  },
  categoryBadgeText: { fontSize: 10, fontWeight: '700', color: '#1E5FA8' },

  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 3 },
  cardRatingNum: { fontSize: 13, fontWeight: '700', color: '#E8772E', marginLeft: 2 },
  cardDot: { fontSize: 10, color: '#D1D5DB', marginHorizontal: 2 },
  cardReviewCount: { fontSize: 12, color: '#6B7280' },
  cardDistance: { fontSize: 12, fontWeight: '600', color: '#1E5FA8' },

  reviewPreview: {
    marginTop: 8, backgroundColor: '#F9FAFB', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row',
    alignItems: 'center', gap: 4,
  },
  reviewPreviewText: { fontSize: 12, color: '#6B7280', flex: 1, fontStyle: 'italic' },
  reviewPreviewAuthor: { fontSize: 11, color: '#9CA3AF' },
  noReviewText: { fontSize: 12, color: '#D1D5DB', marginTop: 8 },

  bookBtn: {
    marginTop: 10, alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#E8772E',
  },
  bookBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  // ─── 빈 상태 ────────────────────────────────────────
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },

  // ─── 하단 지도 버튼 ─────────────────────────────────
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
    alignItems: 'center',
  },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28,
    backgroundColor: '#1E5FA8',
    ...Platform.select({
      ios: { shadowColor: '#1E5FA8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  mapBtnIcon: { fontSize: 18 },
  mapBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // ─── 위치 권한 모달 ─────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalContent: {
    width: '85%', backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 28, alignItems: 'center',
  },
  modalIcon: { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  modalDesc: {
    fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22,
    marginBottom: 20,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtnSecondary: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  modalBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  modalBtnPrimary: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#1E5FA8', alignItems: 'center',
  },
  modalBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
