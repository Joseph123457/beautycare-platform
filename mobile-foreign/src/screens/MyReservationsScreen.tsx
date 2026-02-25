/**
 * 내 예약 목록 화면
 * 상태별 필터 (전체/예정/완료/취소) + 예약 취소
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Reservation, ReservationStatus } from '../types';

// 상태별 색상
const STATUS_COLORS: Record<ReservationStatus, { bg: string; text: string }> = {
  PENDING:   { bg: '#FEF3C7', text: '#B45309' },
  CONFIRMED: { bg: '#DBEAFE', text: '#1D4ED8' },
  DONE:      { bg: '#D1FAE5', text: '#059669' },
  CANCELLED: { bg: '#FEE2E2', text: '#DC2626' },
};

const FILTER_TABS = ['all', 'upcoming', 'past', 'cancelled'] as const;

export default function MyReservationsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  // 예약 목록 로드
  const loadReservations = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data } = await client.get('/reservations');
      setReservations(data.data || []);
    } catch {
      // 에러 무시
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadReservations();
    }, [loadReservations])
  );

  const onRefresh = () => { setRefreshing(true); loadReservations(); };

  // 예약 취소
  const handleCancel = (id: number) => {
    Alert.alert(t('reservations.cancelBooking'), t('reservations.cancelConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'), style: 'destructive',
        onPress: async () => {
          try {
            await client.put(`/reservations/${id}/cancel`);
            loadReservations();
          } catch {
            Alert.alert('Error', 'Failed to cancel.');
          }
        },
      },
    ]);
  };

  // 필터
  const filtered = reservations.filter((r) => {
    if (activeTab === 'upcoming') return r.status === 'PENDING' || r.status === 'CONFIRMED';
    if (activeTab === 'past') return r.status === 'DONE';
    if (activeTab === 'cancelled') return r.status === 'CANCELLED';
    return true;
  });

  // 비로그인
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 48 }}>{'\u{1F4C5}'}</Text>
          <Text style={styles.emptyTitle}>{t('reservations.empty')}</Text>
          <Text style={styles.emptyHint}>{t('reservations.emptyHint')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderReservation = ({ item }: { item: Reservation }) => {
    const colors = STATUS_COLORS[item.status];
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.hospitalName}>{item.hospital_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusText, { color: colors.text }]}>
              {t(`reservations.status.${item.status}`)}
            </Text>
          </View>
        </View>

        <Text style={styles.treatmentName}>{item.treatment_name}</Text>

        <View style={styles.dateRow}>
          <Text style={styles.dateIcon}>{'\u{1F4C5}'}</Text>
          <Text style={styles.dateText}>
            {new Date(item.reserved_at).toLocaleDateString('en', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>

        {item.memo && (
          <Text style={styles.memo}>{item.memo}</Text>
        )}

        {item.status === 'PENDING' && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancel(item.reservation_id)}
          >
            <Text style={styles.cancelBtnText}>{t('reservations.cancelBooking')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('reservations.title')}</Text>
      </View>

      {/* 탭 */}
      <View style={styles.tabRow}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab;
          const labelKey = tab === 'all' ? 'categories.all'
            : tab === 'upcoming' ? 'reservations.upcoming'
            : tab === 'past' ? 'reservations.past'
            : 'reservations.cancelled';
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.reservation_id)}
        renderItem={renderReservation}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E8772E']} tintColor="#E8772E" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48 }}>{'\u{1F4C5}'}</Text>
            <Text style={styles.emptyTitle}>{t('reservations.empty')}</Text>
            <Text style={styles.emptyHint}>{t('reservations.emptyHint')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },

  tabRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: '#E8772E', borderColor: '#E8772E' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },

  card: {
    padding: 16, marginBottom: 10, backgroundColor: '#FFFFFF',
    borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hospitalName: { fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },

  treatmentName: { fontSize: 13, fontWeight: '600', color: '#E8772E', marginTop: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  dateIcon: { fontSize: 14 },
  dateText: { fontSize: 13, color: '#6B7280' },
  memo: { fontSize: 12, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' },

  cancelBtn: {
    marginTop: 10, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6,
    borderWidth: 1, borderColor: '#DC2626',
  },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12 },
  emptyHint: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
});
