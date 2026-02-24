/**
 * 푸시 알림 훅
 *
 * 기능:
 *   1. 알림 권한 요청 + FCM 토큰 발급
 *   2. 토큰을 서버에 PATCH /api/users/push-token으로 저장
 *   3. 포그라운드 알림 수신 시 인앱 배너 표시
 *   4. 알림 클릭 시 해당 화면으로 딥링크 이동
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { NavigationContainerRef } from '@react-navigation/native';
import client from '../api/client';
import { RootStackParamList } from '../types';

// ─── 포그라운드 알림 표시 설정 ────────────────────────
// 앱이 열려있을 때도 배너, 사운드, 뱃지 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── 알림 채널 설정 (Android) ─────────────────────────
async function setupAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('beautycare_default', {
      name: '뷰티케어 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E5FA8',
      sound: 'default',
    });
  }
}

// ─── FCM 푸시 토큰 발급 ──────────────────────────────
async function registerForPushNotifications(): Promise<string | null> {
  // 실제 디바이스인지 확인 (시뮬레이터에서는 푸시 불가)
  if (!Device.isDevice) {
    console.warn('[PUSH] 시뮬레이터에서는 푸시 알림을 사용할 수 없습니다');
    return null;
  }

  // 기존 권한 확인
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // 권한이 없으면 요청
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // 권한 거부
  if (finalStatus !== 'granted') {
    console.warn('[PUSH] 알림 권한이 거부되었습니다');
    return null;
  }

  // Android 채널 설정
  await setupAndroidChannel();

  // FCM 토큰 발급
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.error('[PUSH] 토큰 발급 실패:', error);
    return null;
  }
}

// ─── 서버에 토큰 저장 ─────────────────────────────────
async function savePushTokenToServer(token: string) {
  try {
    await client.patch('/users/push-token', { pushToken: token });
    console.log('[PUSH] 서버에 푸시 토큰 저장 완료');
  } catch (error) {
    console.error('[PUSH] 서버 토큰 저장 실패:', error);
  }
}

// ─── 알림 데이터 기반 딥링크 이동 ─────────────────────
export function handleNotificationNavigation(
  data: Record<string, any>,
  navigation: NavigationContainerRef<RootStackParamList> | null
) {
  if (!navigation || !data?.type) return;

  const { type } = data;

  switch (type) {
    // 예약 관련 알림 → 내 예약 목록
    case 'RESERVATION_CONFIRMED':
    case 'RESERVATION_CANCELLED':
    case 'RESERVATION_REMINDER':
      navigation.navigate('MainTabs', { screen: 'MyReservations' } as any);
      break;

    // 리뷰 요청 → 리뷰 작성 화면
    case 'REVIEW_REQUEST': {
      const hospitalId = Number(data.hospitalId);
      if (hospitalId) {
        navigation.navigate('ReviewWrite', { hospitalId });
      }
      break;
    }

    // 채팅 알림 → 채팅방
    case 'NEW_CHAT_MESSAGE':
    case 'UNANSWERED_CHAT': {
      const roomId = Number(data.roomId);
      const hospitalName = data.hospitalName || '채팅';
      if (roomId) {
        navigation.navigate('ChatRoom', { roomId, hospitalName });
      } else {
        navigation.navigate('MainTabs', { screen: 'Chat' } as any);
      }
      break;
    }

    default:
      break;
  }
}

// ─── 메인 훅 ─────────────────────────────────────────
export function usePushNotifications(
  isLoggedIn: boolean,
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>
) {
  const [pushToken, setPushToken] = useState<string | null>(null);

  // 리스너 ref (정리용)
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // ── 토큰 등록 (로그인 시) ────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;

    (async () => {
      const token = await registerForPushNotifications();
      if (token) {
        setPushToken(token);
        await savePushTokenToServer(token);
      }
    })();
  }, [isLoggedIn]);

  // ── 알림 리스너 등록 ────────────────────────────────
  useEffect(() => {
    // 포그라운드에서 알림 수신 시
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[PUSH] 포그라운드 알림 수신:', notification.request.content.title);
      }
    );

    // 알림 클릭(탭) 시 → 딥링크 이동
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, any>;
        console.log('[PUSH] 알림 클릭:', data);
        handleNotificationNavigation(data, navigationRef.current);
      }
    );

    // 앱이 종료 상태에서 알림 클릭으로 열린 경우
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as Record<string, any>;
        // 약간의 지연 후 네비게이션 (네비게이터 준비 대기)
        setTimeout(() => {
          handleNotificationNavigation(data, navigationRef.current);
        }, 1000);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [navigationRef]);

  return { pushToken };
}
