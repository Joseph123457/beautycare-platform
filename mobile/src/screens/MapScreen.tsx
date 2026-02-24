/**
 * 지도 화면
 * 주변 병원을 지도에서 확인
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import client from '../api/client';
import { Hospital, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'Map'>;
type Nav = StackNavigationProp<RootStackParamList>;

export default function MapScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { lat, lng, category } = route.params;

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const params: Record<string, string | number> = { lat, lng, radius: 10, limit: 50 };
        if (category) params.category = category;
        const { data } = await client.get('/hospitals/search', { params });
        setHospitals(data.data || []);
      } catch {
        // 에러 무시
      } finally {
        setLoading(false);
      }
    })();
  }, [lat, lng, category]);

  // 별점 렌더링
  const renderStars = (rating: number) => {
    let s = '';
    for (let i = 1; i <= 5; i++) s += i <= Math.round(rating) ? '★' : '☆';
    return s;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 지도 영역 (react-native-maps 연동 예정) */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>🗺️</Text>
        <Text style={styles.mapText}>지도 영역</Text>
        <Text style={styles.mapSubText}>
          react-native-maps 연동 시 이 영역에 MapView 표시
        </Text>
      </View>

      {/* 하단 병원 목록 시트 */}
      <View style={styles.listSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>주변 병원 {hospitals.length}곳</Text>

        {loading ? (
          <ActivityIndicator color="#1E5FA8" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={hospitals}
            keyExtractor={(item) => String(item.hospital_id)}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('HospitalDetail', { hospitalId: item.hospital_id })}
              >
                <View style={styles.cardImage}>
                  <Text style={{ fontSize: 22 }}>🏥</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cardRating}>
                    <Text style={{ color: '#E8772E' }}>{renderStars(item.avg_rating)}</Text>
                    {'  '}{item.distance_km?.toFixed(1)}km
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  mapPlaceholder: {
    flex: 1, backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  mapIcon: { fontSize: 48 },
  mapText: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 8 },
  mapSubText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  listSheet: {
    height: 280, backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 8,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB',
    alignSelf: 'center', marginBottom: 12,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  cardImage: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  cardRating: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
