/**
 * 네비게이션 설정
 * 탭 네비게이터 (4개 탭: 피드, 탐색, 채팅, 마이) + 루트 스택 네비게이터
 */
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

// ─── 탭 아이콘 매핑 ───────────────────────────────────
const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  Feed: { focused: 'grid', default: 'grid-outline' },
  Search: { focused: 'search', default: 'search-outline' },
  Chat: { focused: 'chatbubble', default: 'chatbubble-outline' },
  Profile: { focused: 'person', default: 'person-outline' },
};

// ─── 탭 네비게이터 ────────────────────────────────────

function MainTabs() {
  const insets = useSafeAreaInsets();
  // 안드로이드 하단 네비게이션 바와 겹침 방지
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 0);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.default;
          return (
            <View style={focused ? tabStyles.activeIconWrap : undefined}>
              <Ionicons name={iconName} size={22} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: -2,
        },
        tabBarStyle: {
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          backgroundColor: '#111111',
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(255,255,255,0.08)',
          elevation: 0,
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

// ─── 탭 아이콘 스타일 ─────────────────────────────────
const tabStyles = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
});

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
