/**
 * 소켓 컨텍스트
 * 앱 시작 시 한 번만 Socket.io 연결, 화면 이동해도 유지
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

// 개발 환경 서버 주소
const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:3000'    // Android 에뮬레이터
  : 'https://api.beautycare.com';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // 로그인된 사용자만 소켓 연결
    if (!user) {
      // 로그아웃 시 연결 해제
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const connectSocket = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      // 이미 연결되어 있으면 재연결 안 함
      if (socketRef.current?.connected) return;

      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
      });

      socket.on('connect', () => {
        console.log('소켓 연결됨');
        setConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('소켓 연결 해제');
        setConnected(false);
      });

      socket.on('connect_error', (err) => {
        console.error('소켓 연결 에러:', err.message);
        setConnected(false);
      });

      socketRef.current = socket;
    };

    connectSocket();

    // 언마운트 시 정리
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
