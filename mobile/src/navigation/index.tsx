/**
 * 네비게이션 설정
 * 탭 네비게이터 (4개 탭: 피드, 탐색, 채팅, 마이) + 루트 스택 네비게이터
 */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import FeedScreen from '../screens/FeedScreen';
import SearchScreen from '../screens/SearchScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HospitalDetailScreen from '../screens/HospitalDetailScreen';
import ReviewListScreen from '../screens/ReviewListScreen';
import BookingScreen from '../screens/BookingScreen';
import MapScreen from '../screens/MapScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import ReviewWriteScreen from '../screens/ReviewWriteScreen';
import ContentDetailScreen from '../screens/ContentDetailScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SignupScreen from '../screens/SignupScreen';

import { RootStackParamList, TabParamList } from '../types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// ─── 탭 아이콘 (텍스트 이모지 대체) ───────────────────

const TAB_ICONS: Record<string, string> = {
  Feed: '📷',
  Search: '🔍',
  Chat: '💬',
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
      <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarLabel: '피드' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: '탐색' }} />
      <Tab.Screen name="Chat" component={ChatListScreen} options={{ tabBarLabel: '채팅' }} />
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
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ title: route.params.hospitalName })}
      />
      <Stack.Screen
        name="ReviewWrite"
        component={ReviewWriteScreen}
        options={{ title: '리뷰 작성' }}
      />
      <Stack.Screen
        name="ContentDetail"
        component={ContentDetailScreen}
        options={{ title: '콘텐츠 상세' }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: '찜한 콘텐츠' }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ title: '회원가입' }}
      />
    </Stack.Navigator>
  );
}
