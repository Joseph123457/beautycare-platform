/**
 * 찜한 콘텐츠 화면
 * 2열 그리드 + 풀 리프레시 + 빈 상태
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import client from '../api/client';
import { FeedContent, RootStackParamList } from '../types';

type Nav = StackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - CARD_GAP) / 2;

export default function FavoritesScreen() {
  const navigation = useNavigation<Nav>();

  const [favorites, setFavorites] = useState<FeedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── 데이터 로드 ──────────────────────────────────────
  const loadFavorites = useCallback(async () => {
    try {
      const { data } = await client.get('/favorites');
      setFavorites(data.data || []);
    } catch {
      // 에러 무시
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // 풀다운 새로고침
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavorites();
  }, [loadFavorites]);

  // ─── 카드 렌더링 ──────────────────────────────────────
  const renderCard = useCallback(({ item }: { item: FeedContent }) => {
    const thumbUrl = item.photo_urls?.[0];
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ContentDetail', { contentId: item.content_id })}
      >
        {/* 썸네일 */}
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardPlaceholder]}>
            <Text style={{ fontSize: 32 }}>📷</Text>
          </View>
        )}

        {/* 정보 */}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.hospital_name}</Text>
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{item.category}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  const keyExtractor = useCallback((item: FeedContent) => String(item.content_id), []);

  // ─── 로딩 ─────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1E5FA8" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={favorites}
        keyExtractor={keyExtractor}
        renderItem={renderCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
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
            <Text style={{ fontSize: 48 }}>🤍</Text>
            <Text style={styles.emptyTitle}>저장된 콘텐츠가 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              피드에서 마음에 드는 콘텐츠를 저장해보세요
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── 스타일 ────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // ─── 카드 ─────────────────────────────────────────────
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH * 1.2,
  },
  cardPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 10,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#EBF2FA',
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1E5FA8',
  },

  // ─── 빈 상태 ──────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});
