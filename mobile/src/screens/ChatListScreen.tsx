/**
 * 채팅 목록 화면
 * 환자가 문의한 병원 채팅방 목록 표시
 * - 병원 아이콘, 병원명, 마지막 메시지, 시간
 * - 읽지 않은 메시지 수 빨간 배지
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import client from '../api/client';
import { RootStackParamList } from '../types';

type Nav = StackNavigationProp<RootStackParamList>;

// ─── 채팅방 타입 ────────────────────────────────────────

interface ChatRoom {
  room_id: number;
  hospital_id: number;
  hospital_name?: string;
  user_name?: string;
  last_message: string | null;
  last_message_at: string | null;
  user_unread_count: number;
  hospital_unread_count: number;
  hospital_online?: boolean;
}

// ─── 시간 포맷 ──────────────────────────────────────────

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// ─── 메인 컴포넌트 ──────────────────────────────────────

export default function ChatListScreen() {
  const navigation = useNavigation<Nav>();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 화면 포커스 시 목록 새로고침
  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [])
  );

  /** 채팅방 목록 로드 */
  const loadRooms = async () => {
    try {
      const { data } = await client.get('/chats');
      setRooms(data.data.rooms || []);
    } catch {
      // 에러 시 빈 목록 유지
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /** 풀다운 새로고침 */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRooms();
  }, []);

  /** 채팅방 카드 렌더링 */
  const renderRoom = ({ item }: { item: ChatRoom }) => {
    const unread = item.user_unread_count;
    const name = item.hospital_name || `병원 #${item.hospital_id}`;

    return (
      <TouchableOpacity
        style={styles.roomCard}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('ChatRoom', {
            roomId: item.room_id,
            hospitalName: name,
          })
        }
      >
        {/* 병원 아이콘 */}
        <View style={styles.avatar}>
          <Text style={{ fontSize: 24 }}>🏥</Text>
          {/* 온라인 표시 */}
          {item.hospital_online && <View style={styles.onlineDot} />}
        </View>

        {/* 채팅 정보 */}
        <View style={styles.roomBody}>
          <View style={styles.roomTopRow}>
            <Text style={styles.roomName} numberOfLines={1}>{name}</Text>
            <Text style={styles.roomTime}>{formatTime(item.last_message_at)}</Text>
          </View>
          <View style={styles.roomBottomRow}>
            <Text style={styles.roomMessage} numberOfLines={1}>
              {item.last_message || '채팅을 시작해보세요'}
            </Text>
            {/* 읽지 않은 메시지 배지 */}
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── 렌더링 ─────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
      </View>

      {loading ? (
        // 로딩 스켈레톤
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={[styles.avatar, styles.skeleton]} />
              <View style={{ flex: 1, gap: 8 }}>
                <View style={[styles.skeleton, { width: 120, height: 14, borderRadius: 4 }]} />
                <View style={[styles.skeleton, { width: 200, height: 12, borderRadius: 4 }]} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => String(item.room_id)}
          renderItem={renderRoom}
          contentContainerStyle={{ paddingBottom: 20 }}
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
              <Text style={{ fontSize: 48 }}>💬</Text>
              <Text style={styles.emptyTitle}>채팅 내역이 없습니다</Text>
              <Text style={styles.emptySubtitle}>
                병원 상세 페이지에서 채팅을 시작할 수 있습니다
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── 스타일 ───────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  skeleton: { backgroundColor: '#E5E7EB' },

  // 헤더
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },

  // 로딩
  loadingContainer: { padding: 16, gap: 12 },
  skeletonCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },

  // 채팅방 카드
  roomCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFFFFF',
  },
  roomBody: { flex: 1 },
  roomTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomName: { fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  roomTime: { fontSize: 12, color: '#9CA3AF' },
  roomBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  roomMessage: { fontSize: 13, color: '#6B7280', flex: 1, marginRight: 8 },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  // 빈 상태
  emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
});
