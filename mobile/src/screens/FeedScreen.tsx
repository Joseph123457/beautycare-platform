/**
 * 피드 화면
 * TikTok 스타일 전체화면 세로 스크롤 피드
 * 다크 모던 디자인 + Ionicons
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, ScrollView, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import client from '../api/client';
import { FeedContent, RootStackParamList } from '../types';
import PhotoCarousel from '../components/PhotoCarousel';

type Nav = StackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── 카테고리 목록 ────────────────────────────────────────
const CATEGORIES = ['전체', '성형외과', '피부과', '치과', '안과'];

// ─── 피드 아이템 (메모이제이션) ───────────────────────────

interface FeedItemProps {
  item: FeedContent;
  itemHeight: number;
  tabBarHeight: number;
  onFavoriteToggle: (id: number, isFav: boolean) => void;
  onNavigateDetail: (id: number) => void;
  onNavigateBooking: (hospitalId: number, hospitalName: string) => void;
}

const FeedItem = React.memo(function FeedItem({
  item, itemHeight, tabBarHeight, onFavoriteToggle, onNavigateDetail, onNavigateBooking,
}: FeedItemProps) {
  return (
    <View style={[styles.feedItem, { height: itemHeight }]}>
      {/* 전체화면 사진 캐러셀 */}
      <PhotoCarousel photos={item.photo_urls} height={itemHeight} />

      {/* 하단 콘텐츠 오버레이 */}
      <View style={[styles.overlay, { paddingBottom: 20 }]}>
        {/* 병원명 + 카테고리 */}
        <View style={styles.hospitalRow}>
          <Text style={styles.hospitalName}>{item.hospital_name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        </View>

        {/* 설명 */}
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        {/* 가격 정보 */}
        {item.pricing_info ? (
          <Text style={styles.pricingInfo}>{item.pricing_info}</Text>
        ) : null}

        {/* 상담 예약 CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.85}
          onPress={() => onNavigateBooking(item.hospital_id, item.hospital_name)}
        >
          <Ionicons name="calendar-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.ctaBtnText}>상담 예약</Text>
        </TouchableOpacity>
      </View>

      {/* 우측 액션 버튼 */}
      <View style={[styles.actionButtons, { bottom: 100 }]}>
        {/* 좋아요 */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onFavoriteToggle(item.content_id, !!item.is_favorite)}
        >
          <View style={[styles.actionCircle, item.is_favorite && styles.actionCircleActive]}>
            <Ionicons
              name={item.is_favorite ? 'heart' : 'heart-outline'}
              size={22}
              color={item.is_favorite ? '#FF4D6A' : '#FFFFFF'}
            />
          </View>
          <Text style={styles.actionCount}>{item.like_count}</Text>
        </TouchableOpacity>

        {/* 조회수 */}
        <View style={styles.actionBtn}>
          <View style={styles.actionCircle}>
            <Ionicons name="eye-outline" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.actionCount}>{item.view_count}</Text>
        </View>

        {/* 상세 보기 */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onNavigateDetail(item.content_id)}
        >
          <View style={styles.actionCircle}>
            <Ionicons name="arrow-forward-circle-outline" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.actionCount}>상세</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── 메인 피드 화면 ────────────────────────────────────────

export default function FeedScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // 실제 피드 아이템 높이 = 화면 높이 - 탭바 높이
  const ITEM_HEIGHT = Dimensions.get('window').height - tabBarHeight;

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
      const items: FeedContent[] = data.data?.contents || data.data?.items || [];
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

  // 카테고리 변경
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
      // 에러 무시
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
      itemHeight={ITEM_HEIGHT}
      tabBarHeight={tabBarHeight}
      onFavoriteToggle={handleFavoriteToggle}
      onNavigateDetail={handleNavigateDetail}
      onNavigateBooking={handleNavigateBooking}
    />
  ), [ITEM_HEIGHT, tabBarHeight, handleFavoriteToggle, handleNavigateDetail, handleNavigateBooking]);

  const keyExtractor = useCallback((item: FeedContent) => String(item.content_id), []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), [ITEM_HEIGHT]);

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
          snapToInterval={ITEM_HEIGHT}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
          }
          ListEmptyComponent={
            <View style={[styles.feedItem, { height: ITEM_HEIGHT }, styles.emptyContainer]}>
              <Ionicons name="images-outline" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyTitle}>콘텐츠가 없습니다</Text>
              <Text style={styles.emptySubtitle}>다른 카테고리를 선택해보세요</Text>
            </View>
          }
        />
      )}

      {/* 상단 카테고리 필터 */}
      <View style={[styles.categoryOverlay, { paddingTop: insets.top + 8 }]}>
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
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => handleCategoryChange(cat)}
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── 스타일 ────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── 카테고리 필터 ──────────────────────────────────────
  categoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  categoryBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  categoryChipActive: {
    backgroundColor: '#FFFFFF',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  categoryChipTextActive: {
    color: '#0A0A0A',
  },

  // ─── 피드 아이템 ────────────────────────────────────────
  feedItem: {
    width: SCREEN_WIDTH,
    backgroundColor: '#0A0A0A',
  },

  // ─── 하단 콘텐츠 오버레이 ──────────────────────────────
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 80,
    paddingHorizontal: 18,
    paddingTop: 60,
    backgroundColor: 'transparent',
  },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  hospitalName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 19,
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pricingInfo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFB347',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ─── CTA 버튼 ──────────────────────────────────────────
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  ctaBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── 우측 액션 버튼 ────────────────────────────────────
  actionButtons: {
    position: 'absolute',
    right: 14,
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircleActive: {
    backgroundColor: 'rgba(255, 77, 106, 0.15)',
  },
  actionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ─── 빈 상태 ───────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 4,
  },
});
