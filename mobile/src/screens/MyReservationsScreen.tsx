/**
 * 내 예약 화면
 * 사용자의 예약 목록 + 상태 필터
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Reservation, ReservationStatus } from '../types';

// 상태 설정
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: '대기',   color: '#B45309', bg: '#FEF3C7' },
  CONFIRMED: { label: '확정',   color: '#1D4ED8', bg: '#DBEAFE' },
  DONE:      { label: '완료',   color: '#059669', bg: '#D1FAE5' },
  CANCELLED: { label: '취소',   color: '#6B7280', bg: '#F3F4F6' },
};

type FilterKey = 'ALL' | ReservationStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'PENDING', label: '대기' },
  { key: 'CONFIRMED', label: '확정' },
  { key: 'DONE', label: '완료' },
  { key: 'CANCELLED', label: '취소' },
];

export default function MyReservationsScreen() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const loadReservations = useCallback(async () => {
    try {
      const { data } = await client.get('/reservations', { params: { limit: 100 } });
      setReservations(data.data || []);
    } catch {
      // 에러 무시
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReservations();
  };

  // 예약 취소
  const handleCancel = (id: number) => {
    Alert.alert('예약 취소', '정말 예약을 취소하시겠습니까?', [
      { text: '아니오', style: 'cancel' },
      {
        text: '취소하기',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.patch(`/reservations/${id}/cancel`);
            setReservations((prev) =>
              prev.map((r) =>
                r.reservation_id === id ? { ...r, status: 'CANCELLED' } : r
              )
            );
          } catch {
            Alert.alert('오류', '예약 취소에 실패했습니다.');
          }
        },
      },
    ]);
  };

  // 필터 적용
  const filtered = filter === 'ALL'
    ? reservations
    : reservations.filter((r) => r.status === filter);

  // 날짜 포맷
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${month}월 ${day}일 ${hours}:${mins}`;
  };

  const renderItem = ({ item }: { item: Reservation }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
    return (
      <View style={styles.card}>
        {/* 상단: 병원명 + 상태 */}
        <View style={styles.cardHeader}>
          <Text style={styles.hospitalName} numberOfLines={1}>{item.hospital_name}</Text>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* 시술명 */}
        <Text style={styles.treatmentName}>{item.treatment_name}</Text>

        {/* 날짜 + 주소 */}
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>{formatDate(item.reserved_at)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText} numberOfLines={1}>{item.hospital_address}</Text>
        </View>

        {/* 메모 */}
        {item.memo && (
          <View style={styles.memoBox}>
            <Text style={styles.memoText} numberOfLines={2}>{item.memo}</Text>
          </View>
        )}

        {/* 취소 버튼 (PENDING만) */}
        {item.status === 'PENDING' && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancel(item.reservation_id)}
          >
            <Text style={styles.cancelBtnText}>예약 취소</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // 비로그인 안내
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>📅</Text>
          <Text style={styles.emptyTitle}>로그인이 필요합니다</Text>
          <Text style={styles.emptyText}>예약 내역을 확인하려면 로그인해주세요</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>내 예약</Text>
      </View>

      {/* 필터 */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTERS}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filterBar}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* 목록 */}
      {loading ? (
        <ActivityIndicator size="large" color="#1E5FA8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.reservation_id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E5FA8']} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>📋</Text>
              <Text style={styles.emptyTitle}>예약 내역이 없습니다</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937' },

  filterBar: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#1E5FA8', borderColor: '#1E5FA8' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hospitalName: { fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  treatmentName: { fontSize: 14, color: '#4B5563', marginTop: 6 },

  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  detailIcon: { fontSize: 13 },
  detailText: { fontSize: 13, color: '#6B7280', flex: 1 },

  memoBox: {
    marginTop: 8, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10,
  },
  memoText: { fontSize: 12, color: '#6B7280', lineHeight: 18 },

  cancelBtn: {
    marginTop: 12, alignSelf: 'flex-end',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
});
