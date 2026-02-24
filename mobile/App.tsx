/**
 * 뷰티케어 환자용 앱 엔트리 포인트
 * AuthProvider + NavigationContainer + 푸시 알림 통합
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import RootNavigator from './src/navigation';
import { RootStackParamList } from './src/types';

// 네비게이션 ref (푸시 알림 딥링크용)
const navigationRef = createNavigationContainerRef<RootStackParamList>();

// 푸시 알림을 초기화하는 내부 컴포넌트 (AuthContext 접근 필요)
function AppContent() {
  const { user } = useAuth();

  // 로그인 상태일 때 푸시 토큰 등록 + 알림 리스너 설정
  usePushNotifications(!!user, navigationRef);

  return (
    <SocketProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
        <StatusBar style="dark" />
      </NavigationContainer>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
