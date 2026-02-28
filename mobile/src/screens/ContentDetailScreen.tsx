/**
 * 콘텐츠 상세 화면
 * 사진 캐러셀 + 병원 정보 + 가격 + 태그 + 하단 예약 버튼
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import client from '../api/client';
import { FeedContent, RootStackParamList } from '../types';
import PhotoCarousel from '../components/PhotoCarousel';

type Route = RouteProp<RootStackParamList, 'ContentDetail'>;
type Nav = StackNavigationProp<RootStackParamList>;

export default function ContentDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { contentId } = route.params;

  const [content, setContent] = useState<FeedContent | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── 데이터 로드 ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get(`/feed/${contentId}`);
        setContent(data.data);
      } catch {
        // 에러 무시
      } finally {
        setLoading(false);
      }
    })();
  }, [contentId]);

  // ─── 로딩 ─────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5FA8" />
      </View>
    );
  }

  // ─── 데이터 없음 ──────────────────────────────────────
  if (!content) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>콘텐츠를 불러올 수 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 사진 캐러셀 */}
        <PhotoCarousel photos={content.photo_urls} height={300} />

        {/* 병원 정보 카드 */}
        <View style={styles.infoSection}>
          <Text style={styles.hospitalName}>{content.hospital_name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{content.category}</Text>
          </View>
        </View>

        {/* 비급여 가격 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>비급여 가격 정보</Text>
          <View style={styles.pricingCard}>
            <Text style={styles.pricingText}>{content.pricing_info}</Text>
          </View>
        </View>

        {/* 상세 설명 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>상세 설명</Text>
          <Text style={styles.descriptionText}>{content.description}</Text>
        </View>

        {/* 태그 */}
        {content.tags && content.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>태그</Text>
            <View style={styles.tagsContainer}>
              {content.tags.map((tag, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 조회수 / 좋아요 */}
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>조회 {content.view_count}</Text>
          <Text style={styles.statsDot}>·</Text>
          <Text style={styles.statsText}>좋아요 {content.like_count}</Text>
        </View>

        {/* 하단 여백 (고정 버튼 겹침 방지) */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => Linking.openURL('tel:1588-0000')}
        >
          <Text style={styles.secondaryBtnText}>전화 문의</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            navigation.navigate('Booking', {
              hospitalId: content.hospital_id,
              hospitalName: content.hospital_name,
            })
          }
        >
          <Text style={styles.primaryBtnText}>상담 예약</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── 스타일 ────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // ─── 병원 정보 ────────────────────────────────────────
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  hospitalName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EBF2FA',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E5FA8',
  },

  // ─── 섹션 공통 ────────────────────────────────────────
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },

  // ─── 가격 정보 ────────────────────────────────────────
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pricingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E8772E',
    lineHeight: 24,
  },

  // ─── 설명 ─────────────────────────────────────────────
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },

  // ─── 태그 ─────────────────────────────────────────────
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  tagText: {
    fontSize: 13,
    color: '#6B7280',
  },

  // ─── 통계 ─────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 6,
  },
  statsText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  statsDot: {
    fontSize: 10,
    color: '#D1D5DB',
  },

  // ─── 하단 고정 버튼 ───────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  secondaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  primaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#1E5FA8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
