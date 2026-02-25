/**
 * 공통 타입 정의
 * 외국인 의료관광 앱 전용 인터페이스
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

// ─── 병원 (다국어 필드 포함) ────────────────────────────

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
  name_en?: string;
  name_ja?: string;
  name_zh?: string;
  address: string;
  address_en?: string;
  category: string;
  description?: string;
  description_en?: string;
  description_ja?: string;
  description_zh?: string;
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
  // 외국인 친화 정보
  has_interpreter?: boolean;
  english_available?: boolean;
  foreign_review_count?: number;
  created_at: string;
}

// ─── 시술 (다국어 + USD 가격) ───────────────────────────

export interface Treatment {
  treatment_id: number;
  hospital_id: number;
  name: string;
  name_en?: string;
  name_ja?: string;
  name_zh?: string;
  description?: string;
  description_en?: string;
  description_ja?: string;
  description_zh?: string;
  price: number;
  price_usd: number;
  duration_min: number;
  is_active: boolean;
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
  is_foreign?: boolean;
}

// ─── 네비게이션 파라미터 ───────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  HospitalDetail: { hospitalId: number };
  ReviewList: { hospitalId: number; hospitalName: string };
  Booking: { hospitalId: number; hospitalName: string };
  Payment: {
    reservationId: number;
    treatmentName: string;
    hospitalName: string;
    reservedAt: string;
    depositKrw: number;
  };
  Map: { lat: number; lng: number; category?: string };
};

export type TabParamList = {
  Home: undefined;
  HospitalSearch: undefined;
  TourGuide: undefined;
  MyReservations: undefined;
  Profile: undefined;
};
