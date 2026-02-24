/**
 * 공통 타입 정의
 * 앱 전체에서 사용하는 인터페이스
 */

// ─── API 응답 ──────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// ─── 사용자 ────────────────────────────────────────────

export interface User {
  user_id: number;
  email: string;
  name: string;
  phone: string;
}

// ─── 병원 ──────────────────────────────────────────────

export interface HospitalLatestReview {
  review_id: number;
  rating: number;
  content: string;
  author_name: string;
  created_at: string;
}

export interface Hospital {
  hospital_id: number;
  name: string;
  address: string;
  category: string;
  description?: string;
  lat: number;
  lng: number;
  avg_rating: number;
  review_count: number;
  distance_km?: number;
  latest_review?: HospitalLatestReview | null;
  operating_hours?: Record<string, string>;
  is_verified?: boolean;
  response_rate?: number;
  profile_score?: number;
  created_at: string;
}

// ─── 예약 ──────────────────────────────────────────────

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'DONE' | 'CANCELLED';

export interface Reservation {
  reservation_id: number;
  treatment_name: string;
  reserved_at: string;
  status: ReservationStatus;
  memo: string | null;
  hospital_name: string;
  hospital_address: string;
  created_at: string;
}

// ─── 리뷰 ──────────────────────────────────────────────

export interface Review {
  review_id: number;
  rating: number;
  content: string;
  photo_urls: string[];
  helpful_count: number;
  created_at: string;
  author_name: string;
}

// ─── 네비게이션 파라미터 ───────────────────────────────

export type RootStackParamList = {
  MainTabs: undefined;
  HospitalDetail: { hospitalId: number };
  ReviewList: { hospitalId: number; hospitalName: string };
  ReviewWrite: { hospitalId: number; hospitalName?: string };
  Booking: { hospitalId: number; hospitalName: string };
  Map: { lat: number; lng: number; category?: string };
  ChatRoom: { roomId: number; hospitalName: string };
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Chat: undefined;
  MyReservations: undefined;
  Profile: undefined;
};
