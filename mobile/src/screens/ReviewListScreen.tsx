/**
 * 리뷰 전체보기 화면
 * 병원 리뷰 목록 + 페이지네이션
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import client from '../api/client';
import { Review, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'ReviewList'>;

export default function ReviewListScreen() {
  const route = useRoute<Route>();
  const { hospitalId, hospitalName } = route.params;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadReviews = useCallback(async (p: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const { data } = await client.get(`/hospitals/${hospitalId}/reviews`, {
        params: { page: p, limit: 20, sort: 'latest' },
      });
      const newReviews: Review[] = data.data?.reviews || [];

      if (append) {
        setReviews((prev) => [...prev, ...newReviews]);
      } else {
        setReviews(newReviews);
      }

      setHasMore(newReviews.length >= 20);
    } catch {
      // 에러 무시
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    loadReviews(1);
  }, [loadReviews]);

  // 더 불러오기
  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadReviews(nextPage, true);
  };

  // 별점 렌더링
  const renderStars = (rating: number) => {
    let stars = '';
    for (let i = 1; i <= 5; i++) stars += i <= rating ? '★' : '☆';
    return stars;
  };

  // 날짜 포맷
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const renderItem = ({ item }: { item: Review }) => (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280' }}>
            {item.author_name?.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{item.author_name}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(item.rating)}</Text>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </View>

      {/* 내용 */}
      <Text style={styles.content}>{item.content}</Text>

      {/* 사진 */}
      {item.photo_urls && item.photo_urls.length > 0 && (
        <View style={styles.photoRow}>
          {item.photo_urls.slice(0, 4).map((url, i) => (
            <View key={i} style={styles.photoPlaceholder}>
              <Text style={{ fontSize: 10, color: '#9CA3AF' }}>📷</Text>
            </View>
          ))}
        </View>
      )}

      {/* 하단 */}
      <View style={styles.footer}>
        <Text style={styles.helpful}>👍 도움돼요 {item.helpful_count}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5FA8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => String(item.review_id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <Text style={styles.headerText}>
            {hospitalName} 리뷰 ({reviews.length}개)
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 14, color: '#9CA3AF' }}>리뷰가 없습니다</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#1E5FA8" style={{ paddingVertical: 20 }} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },

  headerText: {
    fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 12,
  },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  authorName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  stars: { fontSize: 12, color: '#E8772E' },
  date: { fontSize: 11, color: '#9CA3AF' },

  content: { fontSize: 14, color: '#4B5563', lineHeight: 22 },

  photoRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  photoPlaceholder: {
    width: 56, height: 56, borderRadius: 8, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },

  footer: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  helpful: { fontSize: 12, color: '#9CA3AF' },

  empty: { alignItems: 'center', paddingTop: 40 },
});
