/**
 * 네비게이션 설정
 * 언어 온보딩 → 메인 탭 (5개) → 상세 스택
 * 탭: 홈 | 병원찾기 | 관광가이드 | 예약 | 마이
 */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '../context/LanguageContext';

// 화면 임포트
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import HospitalSearchScreen from '../screens/HospitalSearchScreen';
import TourGuideScreen from '../screens/TourGuideScreen';
import MyReservationsScreen from '../screens/MyReservationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HospitalDetailScreen from '../screens/HospitalDetailScreen';
import ReviewListScreen from '../screens/ReviewListScreen';
import BookingScreen from '../screens/BookingScreen';
import PaymentScreen from '../screens/PaymentScreen';

import { RootStackParamList, TabParamList } from '../types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// ─── 탭 아이콘 ─────────────────────────────────────────

const TAB_ICONS: Record<string, string> = {
  Home: '\u{1F3E0}',
  HospitalSearch: '\u{1F50D}',
  TourGuide: '\u{1F5FA}\u{FE0F}',
  MyReservations: '\u{1F4C5}',
  Profile: '\u{1F464}',
};

// ─── 탭 네비게이터 ─────────────────────────────────────

function MainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
        tabBarActiveTintColor: '#E8772E',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
          borderTopColor: '#E5E7EB',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: t('common.home') }}
      />
      <Tab.Screen
        name="HospitalSearch"
        component={HospitalSearchScreen}
        options={{ tabBarLabel: t('common.findClinic') }}
      />
      <Tab.Screen
        name="TourGuide"
        component={TourGuideScreen}
        options={{ tabBarLabel: t('common.tourGuide') }}
      />
      <Tab.Screen
        name="MyReservations"
        component={MyReservationsScreen}
        options={{ tabBarLabel: t('common.reservations') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: t('common.myPage') }}
      />
    </Tab.Navigator>
  );
}

// ─── 루트 스택 네비게이터 ──────────────────────────────

export default function RootNavigator() {
  const { onboardingDone, loading } = useLanguage();
  const { t } = useTranslation();

  if (loading) return null; // 언어 로딩 중

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0 },
        headerTintColor: '#1F2937',
        headerTitleStyle: { fontSize: 16, fontWeight: '700' },
        cardStyle: { backgroundColor: '#F9FAFB' },
      }}
    >
      {/* 온보딩 미완료 시 온보딩 화면 먼저 표시 */}
      {!onboardingDone && (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      )}

      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HospitalDetail"
        component={HospitalDetailScreen}
        options={{ title: t('hospital.detail') }}
      />
      <Stack.Screen
        name="ReviewList"
        component={ReviewListScreen}
        options={{ title: t('hospital.allReviews') }}
      />
      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: t('booking.title') }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: t('payment.title') }}
      />
      <Stack.Screen
        name="Map"
        component={BookingScreen}
        options={{ title: t('home.seeOnMap') }}
      />
    </Stack.Navigator>
  );
}
