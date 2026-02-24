/**
 * 탐색 화면
 * 위치 기반 병원 검색 + 지도 + 목록 전환
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import client from '../api/client';
import { Hospital, RootStackParamList } from '../types';

type Nav = StackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  const categories = ['전체', '눈', '코', '피부', '윤곽', '리프팅', '치아'];

  // 위치 권한 요청 + 현재 위치 가져오기
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한', '주변 병원을 검색하려면 위치 권한이 필요합니다.');
        // 기본 좌표 (강남역)
        setLocation({ lat: 37.4979, lng: 127.0276 });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  // 병원 검색
  const searchHospitals = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        lat: location.lat,
        lng: location.lng,
        radius: 10,
      };
      if (selectedCategory !== '전체') {
        params.category = selectedCategory;
      }

      const { data } = await client.get('/hospitals/search', { params });
      setHospitals(data.data || []);
    } catch {
      // 에러 무시
    } finally {
      setLoading(false);
    }
  }, [location, selectedCategory]);

  useEffect(() => {
    if (location) searchHospitals();
  }, [location, searchHospitals]);

  // 검색 필터 적용
  const filtered = search
    ? hospitals.filter(
        (h) =>
          h.name.includes(search) ||
          h.address.includes(search) ||
          h.category.includes(search)
      )
    : hospitals;

  // 별점 렌더링
  const renderStars = (rating: number) => {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += i <= Math.round(rating) ? '★' : '☆';
    }
    return stars;
  };

  const renderHospital = ({ item }: { item: Hospital }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('HospitalDetail', { hospitalId: item.hospital_id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardImage}>
        <Text style={{ fontSize: 28 }}>🏥</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardCategory}>{item.category}</Text>
        <View style={styles.cardRating}>
          <Text style={{ fontSize: 12, color: '#E8772E' }}>{renderStars(item.avg_rating)}</Text>
          <Text style={styles.cardRatingNum}>{item.avg_rating?.toFixed(1) || '-'}</Text>
          <Text style={styles.cardReviewCount}>({item.review_count})</Text>
        </View>
        <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 검색 바 */}
      <View style={styles.searchBar}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="병원명, 시술명, 지역 검색"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ fontSize: 14, color: '#9CA3AF' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 카테고리 필터 */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.categoryBar}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === item && styles.categoryChipTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* 결과 목록 */}
      {loading ? (
        <ActivityIndicator size="large" color="#1E5FA8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.hospital_id)}
          renderItem={renderHospital}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {filtered.length}개의 병원
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 14, height: 48,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937', marginLeft: 8 },

  categoryBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  categoryChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  categoryChipActive: { backgroundColor: '#1E5FA8', borderColor: '#1E5FA8' },
  categoryChipText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  categoryChipTextActive: { color: '#FFFFFF' },

  resultCount: {
    fontSize: 13, color: '#9CA3AF', marginBottom: 10, fontWeight: '500',
  },

  card: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardImage: {
    width: 72, height: 72, borderRadius: 10, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  cardCategory: { fontSize: 12, color: '#1E5FA8', fontWeight: '500', marginTop: 2 },
  cardRating: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  cardRatingNum: { fontSize: 12, fontWeight: '700', color: '#E8772E' },
  cardReviewCount: { fontSize: 11, color: '#9CA3AF' },
  cardAddress: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});
