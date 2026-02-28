/**
 * 피드 화면
 * TikTok 스타일 전체화면 세로 스크롤 피드
 * 카테고리 필터 + 좋아요 + 상담 예약 CTA
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import client from '../api/client';
import { FeedContent, RootStackParamList } from '../types';
import PhotoCarousel from '../components/PhotoCarousel';

type Nav = StackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── 카테고리 목록 ────────────────────────────────────────
const CATEGORIES = ['전체', '성형외과', '피부과', '치과', '안과'];

// ─── 피드 아이템 (메모이제이션) ───────────────────────────

interface FeedItemProps {
  item: FeedContent;
  onFavoriteToggle: (id: number, isFav: boolean) => void;
  onNavigateDetail: (id: number) => void;
  onNavigateBooking: (hospitalId: number, hospitalName: string) => void;
}

const FeedItem = React.memo(function FeedItem({
  item, onFavoriteToggle, onNavigateDetail, onNavigateBooking,
}: FeedItemProps) {
  return (
    <View style={styles.feedItem}>
      {/* 전체화면 사진 캐러셀 */}
      <PhotoCarousel photos={item.photo_urls} height={SCREEN_HEIGHT} />

      {/* 하단 그라데이션 오버레이 */}
      <View style={styles.gradientOverlay}>
        {/* 병원 정보 */}
        <Text style={styles.hospitalName}>{item.hospital_name}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category}</Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.pricingInfo}>{item.pricing_info}</Text>

        {/* 상담 예약 버튼 */}
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.8}
          onPress={() => onNavigateBooking(item.hospital_id, item.hospital_name)}
        >
          <Text style={styles.ctaBtnText}>상담 예약</Text>
        </TouchableOpacity>
      </View>

      {/* 우측 액션 버튼 */}
      <View style={styles.actionButtons}>
        {/* 좋아요 */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onFavoriteToggle(item.content_id, !!item.is_favorite)}
        >
          <Text style={styles.actionIcon}>
            {item.is_favorite ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionCount}>{item.like_count}</Text>
        </TouchableOpacity>

        {/* 상세 정보 */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onNavigateDetail(item.content_id)}
        >
          <Text style={styles.actionIcon}>ℹ️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── 메인 피드 화면 ────────────────────────────────────────

export default function FeedScreen() {
  const navigation = useNavigation<Nav>();

  // 데이터 상태
  const [feedData, setFeedData] = useState<FeedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // 위치 상태
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const locationRef = useRef(location);
  locationRef.current = location;

  // ─── GPS 위치 획득 ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } else {
          // 기본 좌표 (강남역)
          setLocation({ lat: 37.4979, lng: 127.0276 });
        }
      } catch {
        setLocation({ lat: 37.4979, lng: 127.0276 });
      }
    })();
  }, []);

  // ─── 피드 데이터 로드 ──────────────────────────────────
  const loadFeed = useCallback(async (
    coords: { lat: number; lng: number },
    category: string,
    cursorVal: number | null,
    isRefresh: boolean,
  ) => {
    try {
      const params: Record<string, string | number> = {
        lat: coords.lat,
        lng: coords.lng,
        limit: 10,
      };
      if (category !== '전체') params.category = category;
      if (cursorVal) params.cursor = cursorVal;

      const { data } = await client.get('/feed', { params });
      const items: FeedContent[] = data.data?.items || data.data || [];
      const nextCursor = data.data?.next_cursor || null;

      if (isRefresh) {
        setFeedData(items);
      } else {
        setFeedData((prev) => [...prev, ...items]);
      }
      setCursor(nextCursor);
      setHasMore(items.length >= 10);
    } catch {
      // 에러 시 빈 상태 유지
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 위치 획득 완료 시 첫 로드
  useEffect(() => {
    if (location) {
      loadFeed(location, selectedCategory, null, true);
    }
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  // 카테고리 변경 핸들러
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setCursor(null);
    setLoading(true);
    if (locationRef.current) {
      loadFeed(locationRef.current, category, null, true);
    }
  }, [loadFeed]);

  // 풀다운 새로고침
  const onRefresh = useCallback(() => {
    if (!location) return;
    setRefreshing(true);
    setCursor(null);
    loadFeed(location, selectedCategory, null, true);
  }, [location, selectedCategory, loadFeed]);

  // 무한 스크롤
  const onEndReached = useCallback(() => {
    if (!hasMore || loading || !location) return;
    loadFeed(location, selectedCategory, cursor, false);
  }, [hasMore, loading, location, selectedCategory, cursor, loadFeed]);

  // ─── 좋아요 토글 ──────────────────────────────────────
  const handleFavoriteToggle = useCallback(async (contentId: number, isFav: boolean) => {
    try {
      if (isFav) {
        await client.delete(`/favorites/${contentId}`);
      } else {
        await client.post(`/favorites/${contentId}`);
      }
      // 로컬 상태 업데이트
      setFeedData((prev) =>
        prev.map((item) =>
          item.content_id === contentId
            ? {
                ...item,
                is_favorite: !isFav,
                like_count: isFav ? item.like_count - 1 : item.like_count + 1,
              }
            : item
        )
      );
    } catch {
      // 에러 무시 (로그인 필요 등)
    }
  }, []);

  // ─── 네비게이션 핸들러 ─────────────────────────────────
  const handleNavigateDetail = useCallback((contentId: number) => {
    navigation.navigate('ContentDetail', { contentId });
  }, [navigation]);

  const handleNavigateBooking = useCallback((hospitalId: number, hospitalName: string) => {
    navigation.navigate('Booking', { hospitalId, hospitalName });
  }, [navigation]);

  // ─── 피드 아이템 렌더링 ────────────────────────────────
  const renderFeedItem = useCallback(({ item }: { item: FeedContent }) => (
    <FeedItem
      item={item}
      onFavoriteToggle={handleFavoriteToggle}
      onNavigateDetail={handleNavigateDetail}
      onNavigateBooking={handleNavigateBooking}
    />
  ), [handleFavoriteToggle, handleNavigateDetail, handleNavigateBooking]);

  const keyExtractor = useCallback((item: FeedContent) => String(item.content_id), []);

  // 고정 높이 레이아웃 (성능 최적화)
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  }), []);

  // ─── 렌더링 ───────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* 피드 리스트 */}
      {loading && feedData.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : (
        <FlatList
          data={feedData}
          keyExtractor={keyExtractor}
          renderItem={renderFeedItem}
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          pagingEnabled
          showsVerticalScrollIndicator={false}
          windowSize={3}
          maxToRenderPerBatch={3}
          removeClippedSubviews
          getItemLayout={getItemLayout}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
            />
          }
          ListEmptyComponent={
            <View style={[styles.feedItem, styles.emptyContainer]}>
              <Text style={{ fontSize: 48 }}>📷</Text>
              <Text style={styles.emptyTitle}>콘텐츠가 없습니다</Text>
              <Text style={styles.emptySubtitle}>
                다른 카테고리를 선택해보세요
              </Text>
            </View>
          }
        />
      )}

      {/* 상단 카테고리 필터 (절대 위치) */}
      <SafeAreaView style={styles.categoryOverlay} edges={['top']}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBar}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                ]}
                onPress={() => handleCategoryChange(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── 스타일 ────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ─── 로딩 ─────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── 카테고리 필터 (상단 오버레이) ────────────────────
  categoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  categoryBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  categoryChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryChipTextActive: {
    color: '#1F2937',
  },

  // ─── 피드 아이템 ──────────────────────────────────────
  feedItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
  },

  // ─── 그라데이션 오버레이 ──────────────────────────────
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 80,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 6,
  },
  pricingInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8772E',
    marginBottom: 16,
  },

  // ─── CTA 버튼 ─────────────────────────────────────────
  ctaBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1E5FA8',
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── 우측 액션 버튼 ───────────────────────────────────
  actionButtons: {
    position: 'absolute',
    right: 16,
    bottom: 180,
    alignItems: 'center',
    gap: 20,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 28,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },

  // ─── 빈 상태 ──────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
});
