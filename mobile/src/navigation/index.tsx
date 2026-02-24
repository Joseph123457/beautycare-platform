/**
 * 네비게이션 설정
 * 탭 네비게이터 (4개 탭) + 루트 스택 네비게이터 (상세 화면)
 */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import MyReservationsScreen from '../screens/MyReservationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HospitalDetailScreen from '../screens/HospitalDetailScreen';
import ReviewListScreen from '../screens/ReviewListScreen';
import BookingScreen from '../screens/BookingScreen';
import MapScreen from '../screens/MapScreen';

import { RootStackParamList, TabParamList } from '../types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// ─── 탭 아이콘 (텍스트 이모지 대체) ───────────────────

const TAB_ICONS: Record<string, string> = {
  Home: '🏠',
  Search: '🔍',
  MyReservations: '📅',
  Profile: '👤',
};

// ─── 탭 네비게이터 ────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
        tabBarActiveTintColor: '#1E5FA8',
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '홈' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: '탐색' }} />
      <Tab.Screen name="MyReservations" component={MyReservationsScreen} options={{ tabBarLabel: '예약' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: '마이' }} />
    </Tab.Navigator>
  );
}

// ─── 루트 스택 네비게이터 ─────────────────────────────

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0 },
        headerTintColor: '#1F2937',
        headerTitleStyle: { fontSize: 16, fontWeight: '700' },
        cardStyle: { backgroundColor: '#F9FAFB' },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HospitalDetail"
        component={HospitalDetailScreen}
        options={{ title: '병원 상세' }}
      />
      <Stack.Screen
        name="ReviewList"
        component={ReviewListScreen}
        options={{ title: '리뷰 전체보기' }}
      />
      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: '예약하기' }}
      />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{ title: '지도로 보기' }}
      />
    </Stack.Navigator>
  );
}
