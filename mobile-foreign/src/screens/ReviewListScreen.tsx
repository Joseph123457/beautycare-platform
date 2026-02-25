/**
 * 리뷰 전체 목록 화면
 * 외국인 리뷰 우선 표시 탭 포함
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { Review, RootStackParamList } from '../types';

type ReviewRoute = RouteProp<RootStackParamList, 'ReviewList'>;

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: 13, color: i <= Math.round(rating) ? '#E8772E' : '#D1D5DB' }}>
          {'\u2605'}
        </Text>
      ))}
    </View>
  );
}

export default function ReviewListScreen() {
  const route = useRoute<ReviewRoute>();
  const { t } = useTranslation();
  const { hospitalId } = route.params;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'foreign'>('all');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get(`/hospitals/${hospitalId}/reviews`, {
          params: { limit: 100 },
        });
        setReviews(data.data || []);
      } catch {
        // 에러 무시
      } finally {
        setLoading(false);
      }
    })();
  }, [hospitalId]);

  // 필터: 외국인 리뷰 우선
  const filtered = tab === 'foreign'
    ? reviews.filter((r) => r.is_foreign)
    : reviews;

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTop}>
        <Text style={styles.author}>{item.author_name}</Text>
        {item.is_foreign && (
          <View style={styles.foreignBadge}>
            <Text style={styles.foreignBadgeText}>{'\u{1F30F}'} Foreign</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Stars rating={item.rating} />
      </View>
      <Text style={styles.content}>{item.content}</Text>
      <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#E8772E" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* 탭 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'all' && styles.tabActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>
            {t('hospital.allReviews')} ({reviews.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'foreign' && styles.tabActive]}
          onPress={() => setTab('foreign')}
        >
          <Text style={[styles.tabText, tab === 'foreign' && styles.tabTextActive]}>
            {'\u{1F30F}'} {t('hospital.foreignReviews')} ({reviews.filter((r) => r.is_foreign).length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.review_id)}
        renderItem={renderReview}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>{'\u{1F4AC}'}</Text>
            <Text style={styles.emptyText}>{t('hospital.noReviews')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#E8772E' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#E8772E' },

  reviewCard: {
    padding: 16, marginBottom: 10, backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  author: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  foreignBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#DBEAFE' },
  foreignBadgeText: { fontSize: 10, fontWeight: '600', color: '#1D4ED8' },
  content: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  date: { fontSize: 11, color: '#9CA3AF', marginTop: 8 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
});
