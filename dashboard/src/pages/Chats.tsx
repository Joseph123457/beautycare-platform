import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import client from '../api/client';
import { useAuth } from '../hooks/useAuth';

// ─── 타입 정의 ─────────────────────────────────────────

interface ChatRoom {
  room_id: number;
  hospital_id: number;
  user_id: number;
  hospital_name?: string;
  user_name?: string;
  last_message: string | null;
  last_message_at: string | null;
  user_unread_count: number;
  hospital_unread_count: number;
  hospital_online?: boolean;
  // 외국인 환자 정보
  preferred_language?: string;
}

// 국기 이모지 매핑
const FLAG_EMOJI: Record<string, string> = {
  en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
};

// 다국어 빠른 답변 템플릿
const QUICK_REPLIES = [
  {
    label: '예약 확정',
    ko: '예약이 확정되었습니다.',
    en: 'Your reservation has been confirmed.',
    ja: 'ご予約が確定しました。',
    zh: '您的预约已确认。',
  },
  {
    label: '회복 기간',
    ko: '이 시술의 회복 기간은 약 7일입니다.',
    en: 'The recovery period for this procedure is approximately 7 days.',
    ja: 'この施術の回復期間は約7日です。',
    zh: '此手术的恢复期约为7天。',
  },
  {
    label: '금식 안내',
    ko: '시술 전 금식이 필요합니다.',
    en: 'Fasting is required before the procedure.',
    ja: '施術前の絶食が必要です。',
    zh: '手术前需要禁食。',
  },
  {
    label: '통역사 배정',
    ko: '통역사를 배정해드리겠습니다.',
    en: 'We will assign an interpreter for you.',
    ja: '通訳者を手配いたします。',
    zh: '我们将为您安排翻译。',
  },
];

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

// ─── 시간 포맷 헬퍼 ──────────────────────────────────────

function formatRelativeTime(dateStr: string | null): string {
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

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${hour12}:${m}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const mon = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${mon}월 ${day}일 ${weekdays[d.getDay()]}요일`;
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}

// ─── 브라우저 알림 요청 ─────────────────────────────────

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

// ─── 스켈레톤 ────────────────────────────────────────────

function RoomSkeleton() {
  return (
    <div className="px-4 py-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-200 rounded w-24" />
          <div className="h-3 bg-gray-200 rounded w-40" />
        </div>
      </div>
    </div>
  );
}

// ─── 이미지 확대 모달 ────────────────────────────────────

function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div className="relative max-w-3xl max-h-[80vh]">
        <img
          src={src}
          alt="확대 이미지"
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────────────

/** 채팅 관리 페이지 (좌우 분할 레이아웃) */
export default function Chats() {
  const { user } = useAuth();
  const hospitalId = user?.hospital_id;

  // 채팅방 목록
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 선택된 채팅방 + 메시지
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 입력
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // 이미지 확대
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // 번역 상태 (message_id → 번역 텍스트)
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState<Record<number, boolean>>({});
  // 빠른 답변 패널
  const [showQuickReply, setShowQuickReply] = useState(false);

  // 소켓
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ─── 소켓 연결 ───────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    requestNotificationPermission();

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    // 새 메시지 수신
    socket.on('new_message', (msg: Message) => {
      // 현재 선택된 방의 메시지면 추가
      setMessages((prev) => {
        if (prev.length > 0 && prev[0]?.room_id === msg.room_id) {
          return [...prev, msg];
        }
        return prev;
      });

      // 선택된 방이면 읽음 처리
      setSelectedRoomId((currentId) => {
        if (currentId === msg.room_id && msg.sender_type === 'USER') {
          socket.emit('mark_read', { room_id: msg.room_id });
        }
        return currentId;
      });

      // 채팅방 목록 업데이트 (마지막 메시지, 읽지 않은 수)
      setRooms((prev) =>
        prev.map((r) => {
          if (r.room_id === msg.room_id) {
            return {
              ...r,
              last_message: msg.content || '이미지',
              last_message_at: msg.created_at,
              hospital_unread_count:
                msg.sender_type === 'USER'
                  ? r.hospital_unread_count + 1
                  : r.hospital_unread_count,
            };
          }
          return r;
        })
      );

      // 다른 탭에서 작업 중일 때 브라우저 알림
      if (document.hidden && msg.sender_type === 'USER') {
        showBrowserNotification(
          msg.sender_name || '새 메시지',
          msg.content || '이미지를 보냈습니다'
        );
      }
    });

    // 상대방 읽음 알림
    socket.on('messages_read', ({ room_id }: { room_id: number }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.room_id === room_id && m.sender_type === 'HOSPITAL'
            ? { ...m, is_read: true }
            : m
        )
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ─── 채팅방 목록 로드 ─────────────────────────────────

  const loadRooms = useCallback(async () => {
    try {
      const { data } = await client.get('/chats');
      setRooms(data.data.rooms || []);
    } catch {
      // 에러 시 빈 목록 유지
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // ─── 메시지 로드 ──────────────────────────────────────

  const loadMessages = useCallback(async (roomId: number, pageNum: number = 1) => {
    setMessagesLoading(true);
    try {
      const { data } = await client.get(`/chats/${roomId}/messages`, {
        params: { page: pageNum, limit: 30 },
      });
      const fetched: Message[] = data.data.messages || [];

      if (pageNum === 1) {
        setMessages(fetched.reverse());
      } else {
        setMessages((prev) => [...fetched.reverse(), ...prev]);
      }

      setHasMore(fetched.length === 30);
    } catch {
      // 에러 무시
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // 채팅방 선택 시 메시지 로드
  const selectRoom = useCallback((roomId: number) => {
    setSelectedRoomId(roomId);
    setPage(1);
    setHasMore(true);
    loadMessages(roomId, 1);

    // 소켓으로 방 입장 + 읽음 처리
    const socket = socketRef.current;
    if (socket) {
      socket.emit('join_room', { room_id: roomId });
      socket.emit('mark_read', { room_id: roomId });
    }

    // 로컬 unread 카운트 초기화
    setRooms((prev) =>
      prev.map((r) =>
        r.room_id === roomId ? { ...r, hospital_unread_count: 0 } : r
      )
    );
  }, [loadMessages]);

  // 스크롤 맨 아래로
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 이전 메시지 로드
  const loadOlderMessages = useCallback(() => {
    if (!hasMore || messagesLoading || !selectedRoomId) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(selectedRoomId, nextPage);
  }, [hasMore, messagesLoading, selectedRoomId, page, loadMessages]);

  // ─── 메시지 번역 (DeepL API) ───────────────────────────

  const translateMessage = useCallback(async (messageId: number, roomId: number, text: string) => {
    if (translations[messageId]) return; // 이미 번역됨
    setTranslating((prev) => ({ ...prev, [messageId]: true }));
    try {
      const { data } = await client.post(`/chats/${roomId}/translate`, { text, targetLang: 'ko' });
      if (data.success && data.data?.translated) {
        setTranslations((prev) => ({ ...prev, [messageId]: data.data.translated }));
      }
    } catch {
      // 번역 실패 시 무시
    } finally {
      setTranslating((prev) => ({ ...prev, [messageId]: false }));
    }
  }, [translations]);

  // ─── 메시지 전송 ──────────────────────────────────────

  const sendMessage = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !inputText.trim() || !selectedRoomId) return;

    setSending(true);
    socket.emit(
      'send_message',
      {
        room_id: selectedRoomId,
        content: inputText.trim(),
        image_url: null,
      },
      (res: any) => {
        if (res?.error) {
          console.error('전송 실패:', res.error);
        }
        setSending(false);
      }
    );
    setInputText('');
  }, [inputText, selectedRoomId]);

  // Enter 키로 전송 (Shift+Enter는 줄바꿈)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // ─── 채팅방 목록 필터링 + 정렬 (미답변 상단 고정) ────

  const filteredRooms = rooms
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const name = r.user_name || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // 미답변 (hospital_unread_count > 0) 상단 고정
      const aUnanswered = a.hospital_unread_count > 0 ? 1 : 0;
      const bUnanswered = b.hospital_unread_count > 0 ? 1 : 0;
      if (aUnanswered !== bUnanswered) return bUnanswered - aUnanswered;

      // 최근 메시지 순
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });

  // 선택된 채팅방 정보
  const selectedRoom = rooms.find((r) => r.room_id === selectedRoomId);

  // 날짜 구분선 필요 여부
  const needsDateSeparator = (index: number): boolean => {
    if (index === 0) return true;
    return getDateKey(messages[index].created_at) !== getDateKey(messages[index - 1].created_at);
  };

  // 병원 미연결
  if (!hospitalId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        연결된 병원 정보가 없습니다. 관리자에게 문의해주세요.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col">
      {/* 헤더 */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">채팅 관리</h2>
        <p className="text-sm text-gray-500 mt-0.5">환자 문의에 실시간으로 응답하세요</p>
      </div>

      {/* 좌우 분할 패널 */}
      <div className="flex-1 flex bg-white rounded-xl border border-gray-200 overflow-hidden min-h-0">

        {/* ─── 왼쪽 패널: 채팅방 목록 ───────────────── */}
        <div className="w-80 border-r border-gray-200 flex flex-col shrink-0">
          {/* 검색창 */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="환자 이름으로 검색"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
              />
            </div>
          </div>

          {/* 채팅방 리스트 */}
          <div className="flex-1 overflow-y-auto">
            {roomsLoading ? (
              <>
                <RoomSkeleton />
                <RoomSkeleton />
                <RoomSkeleton />
                <RoomSkeleton />
              </>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                <svg className="w-10 h-10 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {searchQuery ? '검색 결과가 없습니다' : '채팅 내역이 없습니다'}
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isSelected = room.room_id === selectedRoomId;
                const unread = room.hospital_unread_count;
                const isForeign = room.preferred_language && room.preferred_language !== 'ko';
                const flag = isForeign ? (FLAG_EMOJI[room.preferred_language!] || '🌐') : '';
                const userName = room.user_name || `환자 #${room.user_id}`;

                return (
                  <button
                    key={room.room_id}
                    onClick={() => selectRoom(room.room_id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-gray-50 ${
                      isSelected
                        ? 'bg-[#1E5FA8]/5 border-l-2 border-l-[#1E5FA8]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* 환자 아바타 */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-500">
                          {userName.charAt(0)}
                        </span>
                      </div>
                      {/* 미답변 표시 점 */}
                      {unread > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* 채팅 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm truncate ${unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {flag && <span className="mr-1">{flag}</span>}{userName}
                        </span>
                        <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                          {formatRelativeTime(room.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-xs truncate ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                          {room.last_message || '채팅을 시작해보세요'}
                        </span>
                        {/* 읽지 않은 메시지 배지 */}
                        {unread > 0 && (
                          <span className="ml-2 shrink-0 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─── 오른쪽 패널: 채팅 내용 ──────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedRoomId && selectedRoom ? (
            <>
              {/* 채팅방 헤더 */}
              <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-500">
                      {(selectedRoom.user_name || '?').charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {selectedRoom.user_name || `환자 #${selectedRoom.user_id}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => loadRooms()}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  새로고침
                </button>
              </div>

              {/* 메시지 목록 */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-gray-50"
              >
                {/* 이전 메시지 로드 버튼 */}
                {hasMore && (
                  <div className="flex justify-center pb-3">
                    <button
                      onClick={loadOlderMessages}
                      disabled={messagesLoading}
                      className="text-xs text-[#1E5FA8] hover:underline disabled:opacity-50"
                    >
                      {messagesLoading ? '불러오는 중...' : '이전 메시지 보기'}
                    </button>
                  </div>
                )}

                {/* 메시지 목록이 비어있을 때 */}
                {!messagesLoading && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm">첫 메시지를 보내보세요!</p>
                  </div>
                )}

                {/* 메시지 렌더링 */}
                {messages.map((msg, index) => {
                  const isMine = msg.sender_type === 'HOSPITAL';
                  const showDate = needsDateSeparator(index);

                  return (
                    <div key={msg.message_id}>
                      {/* 날짜 구분선 */}
                      {showDate && (
                        <div className="flex items-center gap-3 py-4">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-[11px] text-gray-400 font-medium">
                            {formatDate(msg.created_at)}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      )}

                      {/* 말풍선 */}
                      <div className={`flex mb-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {/* 발신자 아바타 (환자만) */}
                        {!isMine && (
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
                            <span className="text-xs font-medium text-gray-500">
                              {(msg.sender_name || '?').charAt(0)}
                            </span>
                          </div>
                        )}

                        <div className={`max-w-[65%] ${isMine ? 'items-end' : 'items-start'}`}>
                          {/* 발신자 이름 (환자만) */}
                          {!isMine && msg.sender_name && (
                            <p className="text-[11px] text-gray-500 font-medium mb-1">
                              {msg.sender_name}
                            </p>
                          )}

                          {/* 메시지 내용 */}
                          <div
                            className={`rounded-2xl px-3.5 py-2.5 ${
                              isMine
                                ? 'bg-[#1E5FA8] text-white rounded-br-sm'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                            }`}
                          >
                            {/* 이미지 */}
                            {msg.image_url && (
                              <img
                                src={msg.image_url}
                                alt="첨부 이미지"
                                className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-80 transition-opacity mb-1"
                                onClick={() => setLightboxSrc(msg.image_url)}
                              />
                            )}
                            {/* 텍스트 */}
                            {msg.content && (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.content}
                              </p>
                            )}
                          </div>

                          {/* 번역 결과 표시 */}
                          {!isMine && translations[msg.message_id] && (
                            <div className="mt-1.5 pt-1.5 border-t border-gray-200/50">
                              <p className="text-[11px] text-gray-400 mb-0.5">🇰🇷 번역</p>
                              <p className="text-xs text-gray-600 leading-relaxed">{translations[msg.message_id]}</p>
                            </div>
                          )}

                          {/* 시간 + 읽음 + 번역 버튼 */}
                          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {isMine && msg.is_read && (
                              <span className="text-[10px] text-[#1E5FA8] font-medium">읽음</span>
                            )}
                            <span className="text-[10px] text-gray-400">
                              {formatTime(msg.created_at)}
                            </span>
                            {/* 외국인 메시지: 번역 보기 버튼 */}
                            {!isMine && msg.content && selectedRoom?.preferred_language && selectedRoom.preferred_language !== 'ko' && !translations[msg.message_id] && (
                              <button
                                onClick={(e) => { e.stopPropagation(); translateMessage(msg.message_id, msg.room_id, msg.content!); }}
                                disabled={translating[msg.message_id]}
                                className="ml-1 text-[10px] text-[#1E5FA8] hover:underline disabled:opacity-50"
                              >
                                {translating[msg.message_id] ? '번역 중...' : '번역 보기'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* 빠른 답변 템플릿 (외국인 채팅일 때 표시) */}
              {selectedRoom?.preferred_language && selectedRoom.preferred_language !== 'ko' && (
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 shrink-0">
                  <button
                    onClick={() => setShowQuickReply(!showQuickReply)}
                    className="text-xs text-[#1E5FA8] font-medium hover:underline flex items-center gap-1"
                  >
                    ⚡ 자주 쓰는 답변 {showQuickReply ? '▲' : '▼'}
                  </button>
                  {showQuickReply && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {QUICK_REPLIES.map((tpl) => {
                        const lang = selectedRoom.preferred_language as keyof typeof tpl;
                        const foreignText = tpl[lang] || tpl.en;
                        return (
                          <button
                            key={tpl.label}
                            onClick={() => { setInputText(`${tpl.ko}\n\n${foreignText}`); setShowQuickReply(false); }}
                            className="text-left px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-[#1E5FA8]/30 transition-colors"
                          >
                            <p className="text-xs font-medium text-gray-800">{tpl.ko}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{foreignText}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 입력 영역 */}
              <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
                <div className="flex items-end gap-3">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="메시지를 입력하세요 (Enter로 전송, Shift+Enter 줄바꿈)"
                    rows={1}
                    className="flex-1 resize-none min-h-[40px] max-h-[120px] px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]/30 focus:border-[#1E5FA8]"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending}
                    className="h-10 px-5 bg-[#1E5FA8] text-white text-sm font-bold rounded-xl hover:bg-[#1a5293] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shrink-0"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      '전송'
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* 채팅방 미선택 상태 */
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm font-medium">채팅방을 선택하세요</p>
              <p className="text-xs mt-1">왼쪽 목록에서 환자를 선택하면 대화 내용이 표시됩니다</p>
            </div>
          )}
        </div>
      </div>

      {/* 이미지 확대 모달 */}
      {lightboxSrc && (
        <ImageModal src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
