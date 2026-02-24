/**
 * 병원 상세 화면
 * 사진 슬라이더, 병원 정보, 운영시간, 시술 목록, 리뷰 미리보기, 예약 버튼
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import client from '../api/client';
import { Hospital, Review, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'HospitalDetail'>;
type Nav = StackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 사진 슬라이더 플레이스홀더 (실제 이미지 API 연동 전)
const PHOTO_PLACEHOLDERS = ['🏥', '💉', '⚕️', '🩺'];

// 시술 목록 (시술 테이블 구축 전 임시 데이터)
const MOCK_TREATMENTS = [
  { name: '쌍꺼풀 수술', price: '80만원~' },
  { name: '코 성형', price: '150만원~' },
  { name: '보톡스', price: '5만원~' },
  { name: '필러', price: '15만원~' },
  { name: '레이저 토닝', price: '10만원~' },
  { name: '리프팅', price: '50만원~' },
];

// 요일 매핑
const DAY_MAP: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목',
  fri: '금', sat: '토', sun: '일',
};

export default function HospitalDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { hospitalId } = route.params;

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await client.get(`/hospitals/${hospitalId}`);
        const { hospital: h, reviews: r, availability } = res.data;
        setHospital(h);
        setReviews(r || []);
        setIsAvailable(availability?.is_available ?? true);
      } catch {
        // 에러 무시
      } finally {
        setLoading(false);
      }
    })();
  }, [hospitalId]);

  // 별점 렌더링
  const renderStars = (rating: number) => {
    let s = '';
    for (let i = 1; i <= 5; i++) s += i <= Math.round(rating) ? '★' : '☆';
    return s;
  };

  // 사진 슬라이더 스크롤 핸들러
  const handlePhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setPhotoIndex(Math.round(x / SCREEN_WIDTH));
  };

  // 운영시간 렌더링
  const renderOperatingHours = (hours: Record<string, string>) => {
    const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    return dayOrder.map((key) => {
      const value = hours[key];
      if (!value) return null;
      return (
        <View key={key} style={styles.hoursRow}>
          <Text
            style={[
              styles.hoursDay,
              key === 'sun' && { color: '#DC2626' },
              key === 'sat' && { color: '#1E5FA8' },
            ]}
          >
            {DAY_MAP[key]}
          </Text>
          <Text style={styles.hoursValue}>{value === 'closed' ? '휴무' : value}</Text>
        </View>
      );
    });
  };

  // ─── 로딩 스켈레톤 ───
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ height: 260, backgroundColor: '#E5E7EB' }} />
        <View style={{ padding: 20 }}>
          <View style={{ width: 60, height: 20, backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 8 }} />
          <View style={{ width: 200, height: 26, backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 12 }} />
          <View style={{ width: 150, height: 16, backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 8 }} />
          <View style={{ height: 16, backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 24 }} />
          <View style={{ height: 80, backgroundColor: '#E5E7EB', borderRadius: 12, marginBottom: 16 }} />
          <View style={{ height: 80, backgroundColor: '#E5E7EB', borderRadius: 12 }} />
        </View>
      </View>
    );
  }

  if (!hospital) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>병원 정보를 불러올 수 없습니다</Text>
      </View>
    );
  }

  const previewReviews = reviews.slice(0, 3);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ─── 사진 슬라이더 ─── */}
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handlePhotoScroll}
            scrollEventThrottle={16}
          >
            {PHOTO_PLACEHOLDERS.map((emoji, idx) => (
              <View key={idx} style={styles.photoSlide}>
                <Text style={{ fontSize: 64 }}>{emoji}</Text>
                <Text style={styles.photoPlaceholder}>병원 사진 {idx + 1}</Text>
              </View>
            ))}
          </ScrollView>

          {/* 인디케이터 점 */}
          <View style={styles.dotsContainer}>
            {PHOTO_PLACEHOLDERS.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, photoIndex === idx && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* ─── 기본 정보 ─── */}
        <View style={styles.infoSection}>
          <View style={styles.categoryRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{hospital.category}</Text>
            </View>
            {hospital.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>인증됨</Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>{hospital.name}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(hospital.avg_rating)}</Text>
            <Text style={styles.ratingNum}>{hospital.avg_rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.reviewCount}>리뷰 {hospital.review_count}개</Text>
          </View>

          {/* 주소 + 거리 */}
          <View style={styles.addressRow}>
            <Text style={styles.addressIcon}>📍</Text>
            <Text style={styles.address}>{hospital.address}</Text>
            {hospital.distance_km != null && (
              <Text style={styles.distance}>{hospital.distance_km.toFixed(1)}km</Text>
            )}
          </View>

          {hospital.description ? (
            <Text style={styles.description}>{hospital.description}</Text>
          ) : null}
        </View>

        {/* ─── 운영시간 ─── */}
        {hospital.operating_hours && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>운영시간</Text>
            <View style={styles.hoursCard}>
              {renderOperatingHours(hospital.operating_hours)}
            </View>
          </View>
        )}

        {/* ─── 시술 목록 ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시술 목록</Text>
          <View style={styles.treatmentCard}>
            {MOCK_TREATMENTS.map((t, idx) => (
              <View
                key={t.name}
                style={[
                  styles.treatmentRow,
                  idx < MOCK_TREATMENTS.length - 1 && styles.treatmentBorder,
                ]}
              >
                <Text style={styles.treatmentName}>{t.name}</Text>
                <Text style={styles.treatmentPrice}>{t.price}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── 리뷰 미리보기 ─── */}
        <View style={styles.section}>
          <View style={styles.reviewHeader}>
            <Text style={styles.sectionTitle}>리뷰</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ReviewList', {
                  hospitalId: hospital.hospital_id,
                  hospitalName: hospital.name,
                })
              }
            >
              <Text style={styles.seeAll}>더보기 ›</Text>
            </TouchableOpacity>
          </View>

          {previewReviews.length === 0 ? (
            <Text style={styles.noReview}>아직 리뷰가 없습니다</Text>
          ) : (
            previewReviews.map((review) => (
              <View key={review.review_id} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E5FA8' }}>
                      {review.author_name?.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewAuthor}>{review.author_name}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString('ko-KR')}
                    </Text>
                  </View>
                  <Text style={styles.reviewStars}>{renderStars(review.rating)}</Text>
                </View>
                <Text style={styles.reviewContent} numberOfLines={2}>
                  {review.content}
                </Text>
                {review.helpful_count > 0 && (
                  <Text style={styles.reviewHelpful}>
                    {review.helpful_count}명에게 도움됨
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* 하단 여백 (고정 버튼 겹침 방지) */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── 하단 고정 예약 버튼 ─── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bookBtn, !isAvailable && styles.bookBtnDisabled]}
          onPress={() =>
            navigation.navigate('Booking', {
              hospitalId: hospital.hospital_id,
              hospitalName: hospital.name,
            })
          }
          disabled={!isAvailable}
        >
          <Text style={styles.bookBtnText}>
            {isAvailable ? '예약하기' : '예약 마감'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB',
  },
  emptyText: { fontSize: 14, color: '#9CA3AF' },

  // ─── 사진 슬라이더 ───
  photoSlide: {
    width: SCREEN_WIDTH, height: 260, backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  photoPlaceholder: { fontSize: 13, color: '#9CA3AF', marginTop: 8 },
  dotsContainer: {
    position: 'absolute', bottom: 12, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: '#FFFFFF', width: 20 },

  // ─── 기본 정보 ───
  infoSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  categoryBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#EBF5FF',
  },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#1E5FA8' },
  verifiedBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: '#ECFDF5',
  },
  verifiedText: { fontSize: 11, fontWeight: '600', color: '#059669' },
  name: { fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  stars: { fontSize: 14, color: '#E8772E' },
  ratingNum: { fontSize: 15, fontWeight: '700', color: '#E8772E' },
  reviewCount: { fontSize: 13, color: '#9CA3AF' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressIcon: { fontSize: 14 },
  address: { fontSize: 14, color: '#6B7280', flex: 1 },
  distance: { fontSize: 13, fontWeight: '600', color: '#1E5FA8' },
  description: { fontSize: 14, color: '#4B5563', lineHeight: 22, marginTop: 14 },

  // ─── 섹션 공통 ───
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },

  // ─── 운영시간 ───
  hoursCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  hoursRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  hoursDay: { fontSize: 14, fontWeight: '600', color: '#1F2937', width: 30 },
  hoursValue: { fontSize: 14, color: '#4B5563' },

  // ─── 시술 목록 ───
  treatmentCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  treatmentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  treatmentBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  treatmentName: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  treatmentPrice: { fontSize: 14, fontWeight: '700', color: '#E8772E' },

  // ─── 리뷰 ───
  reviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#1E5FA8' },
  noReview: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 24 },
  reviewCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#EBF5FF',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAuthor: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  reviewDate: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  reviewStars: { fontSize: 12, color: '#E8772E' },
  reviewContent: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
  reviewHelpful: { fontSize: 12, color: '#6B7280', marginTop: 6 },

  // ─── 하단 고정 버튼 ───
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  bookBtn: {
    height: 52, backgroundColor: '#1E5FA8', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  bookBtnDisabled: { backgroundColor: '#9CA3AF' },
  bookBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
