/**
 * 채팅방 화면
 * 병원-환자 1:1 실시간 채팅
 * - 말풍선 UI (내 메시지: 오른쪽 파란색, 상대: 왼쪽 회색)
 * - 텍스트 입력 + 전송 버튼
 * - 이미지 첨부 (expo-image-picker)
 * - 날짜 구분선
 * - 읽음 확인 표시
 * - 소켓으로 실시간 메시지 수신
 * - 키보드 올라올 때 스크롤 자동 조정
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { RootStackParamList } from '../types';

type ChatRoomRoute = RouteProp<RootStackParamList, 'ChatRoom'>;

// ─── 메시지 타입 ────────────────────────────────────────

interface Message {
  message_id: number;
  room_id: number;
  sender_id: number;
  sender_type: 'HOSPITAL' | 'USER';
  sender_name?: string;
  content: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── 날짜 포맷 헬퍼 ────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${m}월 ${day}일 ${weekdays[d.getDay()]}요일`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${hour12}:${m}`;
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}

// ─── 메인 컴포넌트 ──────────────────────────────────────

export default function ChatRoomScreen() {
  const route = useRoute<ChatRoomRoute>();
  const { roomId } = route.params;
  const { user } = useAuth();
  const { socket } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const userId = user?.user_id;

  // ─── 메시지 로드 ────────────────────────────────────

  const loadMessages = useCallback(async (pageNum: number = 1) => {
    try {
      const { data } = await client.get(`/chats/${roomId}/messages`, {
        params: { page: pageNum, limit: 20 },
      });
      const fetched: Message[] = data.data.messages || [];

      if (pageNum === 1) {
        // 최초 로드: 최신순 → 시간순으로 뒤집기
        setMessages(fetched.reverse());
      } else {
        // 이전 메시지 로드: 앞에 추가
        setMessages((prev) => [...fetched.reverse(), ...prev]);
      }

      setHasMore(fetched.length === 20);
    } catch {
      // 에러 시 무시
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadMessages(1);
  }, [loadMessages]);

  // ─── 소켓 이벤트 ───────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    // 채팅방 입장
    socket.emit('join_room', { room_id: roomId });

    // 새 메시지 수신
    const handleNewMessage = (msg: Message) => {
      if (msg.room_id === roomId) {
        setMessages((prev) => [...prev, msg]);

        // 상대 메시지면 읽음 처리
        if (msg.sender_id !== userId) {
          socket.emit('mark_read', { room_id: roomId });
        }
      }
    };

    // 상대방 읽음 알림 → 모든 내 메시지를 읽음으로 변경
    const handleMessagesRead = ({ room_id }: { room_id: number }) => {
      if (room_id === roomId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === userId ? { ...m, is_read: true } : m
          )
        );
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, roomId, userId]);

  // ─── 메시지 전송 ───────────────────────────────────

  const sendMessage = useCallback(async (content?: string, imageUrl?: string) => {
    if (!socket || (!content?.trim() && !imageUrl)) return;

    setSending(true);
    socket.emit(
      'send_message',
      {
        room_id: roomId,
        content: content?.trim() || null,
        image_url: imageUrl || null,
      },
      (res: any) => {
        if (res?.error) {
          console.error('전송 실패:', res.error);
        }
        setSending(false);
      }
    );
    setInputText('');
  }, [socket, roomId]);

  // ─── 이미지 첨부 ───────────────────────────────────

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      // 실제 서비스에서는 S3 업로드 후 URL 전달
      // 여기서는 로컬 URI를 전달 (데모)
      sendMessage(undefined, result.assets[0].uri);
    }
  }, [sendMessage]);

  // ─── 이전 메시지 로드 ──────────────────────────────

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(nextPage);
  }, [hasMore, loading, page, loadMessages]);

  // ─── 날짜 구분선 필요 여부 ─────────────────────────

  const needsDateSeparator = (index: number): boolean => {
    if (index === 0) return true;
    const curr = getDateKey(messages[index].created_at);
    const prev = getDateKey(messages[index - 1].created_at);
    return curr !== prev;
  };

  // ─── 말풍선 렌더링 ────────────────────────────────

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = item.sender_id === userId;
    const showDate = needsDateSeparator(index);

    return (
      <View>
        {/* 날짜 구분선 */}
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            <View style={styles.dateLine} />
          </View>
        )}

        {/* 말풍선 */}
        <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
          {!isMine && (
            <View style={styles.senderAvatar}>
              <Text style={{ fontSize: 16 }}>🏥</Text>
            </View>
          )}

          <View style={{ maxWidth: '72%' }}>
            {/* 발신자 이름 (상대방만) */}
            {!isMine && item.sender_name && (
              <Text style={styles.senderName}>{item.sender_name}</Text>
            )}

            {/* 메시지 내용 */}
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
              {item.image_url && (
                <View style={styles.imagePreview}>
                  <Text style={{ fontSize: 32 }}>🖼️</Text>
                  <Text style={styles.imageText}>이미지</Text>
                </View>
              )}
              {item.content && (
                <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
                  {item.content}
                </Text>
              )}
            </View>

            {/* 시간 + 읽음 */}
            <View style={[styles.metaRow, isMine && { alignSelf: 'flex-end' }]}>
              {isMine && item.is_read && (
                <Text style={styles.readLabel}>읽음</Text>
              )}
              <Text style={styles.timeLabel}>{formatTime(item.created_at)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ─── 렌더링 ─────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E5FA8" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* 메시지 목록 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.message_id)}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onStartReached={loadMore}
          onStartReachedThreshold={0.1}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 40 }}>👋</Text>
              <Text style={styles.emptyText}>첫 메시지를 보내보세요!</Text>
            </View>
          }
        />

        {/* 입력 영역 */}
        <View style={styles.inputBar}>
          {/* 이미지 첨부 버튼 */}
          <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
            <Text style={{ fontSize: 20 }}>📷</Text>
          </TouchableOpacity>

          {/* 텍스트 입력 */}
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="메시지를 입력하세요"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
          />

          {/* 전송 버튼 */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || sending}
          >
            <Text style={styles.sendBtnText}>전송</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── 스타일 ───────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  // 로딩
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // 날짜 구분선
  dateSeparator: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 16,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dateText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  // 말풍선 행
  bubbleRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },

  // 발신자 아바타
  senderAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
    marginRight: 8, marginBottom: 20,
  },
  senderName: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 4 },

  // 말풍선
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' },
  bubbleMine: { backgroundColor: '#1E5FA8', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextMine: { color: '#FFFFFF' },
  bubbleTextOther: { color: '#1F2937' },

  // 이미지 미리보기
  imagePreview: {
    width: 160, height: 120, borderRadius: 12,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  imageText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  // 시간 + 읽음
  metaRow: { flexDirection: 'row', gap: 4, marginTop: 4, alignItems: 'center' },
  readLabel: { fontSize: 11, color: '#1E5FA8', fontWeight: '500' },
  timeLabel: { fontSize: 11, color: '#9CA3AF' },

  // 빈 상태
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#9CA3AF', marginTop: 8 },

  // 입력 바
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
    gap: 8,
  },
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  textInput: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#1F2937',
  },
  sendBtn: {
    height: 40, paddingHorizontal: 16,
    borderRadius: 20, backgroundColor: '#1E5FA8',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
  sendBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
