/**
 * 예약하기 화면
 * 시술 드롭다운, 달력 날짜 선택, 시간 선택, 메모, 확인 모달, 토스트
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Animated,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'Booking'>;
type Nav = StackNavigationProp<RootStackParamList>;

// 시술 목록
const TREATMENTS = [
  '쌍꺼풀 수술', '코 성형', '지방 흡입', '보톡스', '필러',
  '레이저 토닝', '리프팅', '치아 미백', '기타',
];

// 시간 슬롯
const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00',
];

// 요일 라벨
const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function BookingScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { hospitalId, hospitalName } = route.params;

  // 입력 상태
  const [treatment, setTreatment] = useState('');
  const [showTreatmentPicker, setShowTreatmentPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [memo, setMemo] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 토스트 상태
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [toastOpacity] = useState(() => new Animated.Value(0));

  // 달력 뷰 상태
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // ─── 토스트 표시 ───
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  };

  // ─── 달력 데이터 생성 ───
  const generateCalendar = useCallback(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];

    // 첫 주 빈칸
    for (let i = 0; i < firstDay; i++) cells.push(null);
    // 날짜 채우기
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return cells;
  }, [viewYear, viewMonth]);

  // 날짜 선택 가능 여부 (내일부터)
  const isDateSelectable = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return date >= tomorrow;
  };

  // 날짜 포맷 (표시용)
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK_DAYS[d.getDay()]})`;
  };

  // ISO 날짜 문자열 생성
  const toIsoDate = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewYear}-${m}-${d}`;
  };

  // 이전/다음 달 이동
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  // ─── 예약 확인 모달 열기 (검증) ───
  const handleBookingPress = () => {
    if (!user) {
      showToast('로그인이 필요합니다', 'error');
      return;
    }
    if (!treatment) {
      showToast('시술을 선택해주세요', 'error');
      return;
    }
    if (!selectedDate) {
      showToast('날짜를 선택해주세요', 'error');
      return;
    }
    if (!selectedTime) {
      showToast('시간을 선택해주세요', 'error');
      return;
    }
    setShowConfirmModal(true);
  };

  // ─── 예약 확정 API 호출 ───
  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const reserved_at = `${selectedDate}T${selectedTime}:00+09:00`;
      await client.post('/reservations', {
        hospital_id: hospitalId,
        treatment_name: treatment,
        reserved_at,
        memo: memo.trim() || null,
      });

      setShowConfirmModal(false);
      showToast('예약이 완료되었습니다');

      // 토스트 표시 후 홈으로 이동
      setTimeout(() => {
        navigation.navigate('MainTabs');
      }, 2500);
    } catch {
      setShowConfirmModal(false);
      showToast('예약에 실패했습니다. 다시 시도해주세요', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const calendarCells = generateCalendar();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 병원 배너 */}
        <View style={styles.hospitalBanner}>
          <Text style={{ fontSize: 18 }}>🏥</Text>
          <Text style={styles.hospitalName}>{hospitalName}</Text>
        </View>

        {/* ─── 시술 선택 (드롭다운) ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시술 선택</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowTreatmentPicker(true)}
          >
            <Text style={[styles.dropdownText, !treatment && { color: '#9CA3AF' }]}>
              {treatment || '시술을 선택해주세요'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 달력 날짜 선택 ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>날짜 선택</Text>
          <View style={styles.calendarCard}>
            {/* 달력 헤더 */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={prevMonth} style={styles.calendarArrowBtn}>
                <Text style={styles.calendarArrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calendarMonth}>
                {viewYear}년 {viewMonth + 1}월
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.calendarArrowBtn}>
                <Text style={styles.calendarArrowText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* 요일 헤더 */}
            <View style={styles.calendarWeekRow}>
              {WEEK_DAYS.map((d, i) => (
                <Text
                  key={d}
                  style={[
                    styles.calendarWeekDay,
                    i === 0 && { color: '#DC2626' },
                    i === 6 && { color: '#1E5FA8' },
                  ]}
                >
                  {d}
                </Text>
              ))}
            </View>

            {/* 날짜 그리드 */}
            <View style={styles.calendarGrid}>
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} style={styles.calendarCell} />;
                }

                const iso = toIsoDate(day);
                const selectable = isDateSelectable(day);
                const isSelected = selectedDate === iso;
                const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.calendarCell,
                      isSelected && styles.calendarCellSelected,
                    ]}
                    onPress={() => selectable && setSelectedDate(iso)}
                    disabled={!selectable}
                  >
                    <Text
                      style={[
                        styles.calendarDay,
                        !selectable && styles.calendarDayDisabled,
                        isSelected && styles.calendarDaySelected,
                        dayOfWeek === 0 && selectable && !isSelected && { color: '#DC2626' },
                        dayOfWeek === 6 && selectable && !isSelected && { color: '#1E5FA8' },
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ─── 시간 선택 ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시간 선택</Text>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.timeSlot, selectedTime === t && styles.timeSlotActive]}
                onPress={() => setSelectedTime(t)}
              >
                <Text style={[styles.timeText, selectedTime === t && styles.timeTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── 메모 ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>요청 메모 (선택)</Text>
          <TextInput
            style={styles.memoInput}
            placeholder="병원에 전달할 메모를 입력하세요"
            placeholderTextColor="#9CA3AF"
            value={memo}
            onChangeText={setMemo}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── 하단 예약 버튼 ─── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleBookingPress}>
          <Text style={styles.submitBtnText}>예약하기</Text>
        </TouchableOpacity>
      </View>

      {/* ─── 시술 선택 모달 (바텀시트) ─── */}
      <Modal visible={showTreatmentPicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowTreatmentPicker(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>시술 선택</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {TREATMENTS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.pickerItem, treatment === t && styles.pickerItemActive]}
                  onPress={() => { setTreatment(t); setShowTreatmentPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, treatment === t && styles.pickerItemTextActive]}>
                    {t}
                  </Text>
                  {treatment === t && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 예약 확인 모달 (센터) ─── */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.centerOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>예약 확인</Text>

            <View style={styles.confirmDivider} />

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>병원</Text>
              <Text style={styles.confirmValue}>{hospitalName}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>시술</Text>
              <Text style={styles.confirmValue}>{treatment}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>날짜</Text>
              <Text style={styles.confirmValue}>
                {selectedDate ? formatDate(selectedDate) : ''}
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>시간</Text>
              <Text style={styles.confirmValue}>{selectedTime}</Text>
            </View>
            {memo.trim() ? (
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>메모</Text>
                <Text style={[styles.confirmValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                  {memo}
                </Text>
              </View>
            ) : null}

            <View style={styles.confirmDivider} />

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowConfirmModal(false)}
                disabled={submitting}
              >
                <Text style={styles.confirmCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmOkBtn, submitting && { opacity: 0.6 }]}
                onPress={handleConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmOkText}>예약 확정</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── 토스트 알림 ─── */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            toastType === 'error' && styles.toastError,
            { opacity: toastOpacity },
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 100 },

  hospitalBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  hospitalName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },

  section: { marginTop: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },

  // ─── 드롭다운 ───
  dropdown: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    height: 50, backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  dropdownText: { fontSize: 14, color: '#1F2937' },
  dropdownArrow: { fontSize: 10, color: '#9CA3AF' },

  // ─── 달력 ───
  calendarCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  calendarHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  calendarArrowBtn: { padding: 8 },
  calendarArrowText: { fontSize: 22, fontWeight: '300', color: '#6B7280' },
  calendarMonth: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  calendarWeekRow: { flexDirection: 'row', marginBottom: 8 },
  calendarWeekDay: {
    flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#6B7280',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: {
    width: '14.28%' as unknown as number,
    aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
  },
  calendarCellSelected: { backgroundColor: '#1E5FA8', borderRadius: 20 },
  calendarDay: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  calendarDayDisabled: { color: '#D1D5DB' },
  calendarDaySelected: { color: '#FFFFFF', fontWeight: '700' },

  // ─── 시간 ───
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  timeSlotActive: { backgroundColor: '#1E5FA8', borderColor: '#1E5FA8' },
  timeText: { fontSize: 13, fontWeight: '500', color: '#4B5563' },
  timeTextActive: { color: '#FFFFFF' },

  // ─── 메모 ───
  memoInput: {
    height: 80, backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 12, fontSize: 14, color: '#1F2937',
    borderWidth: 1, borderColor: '#E5E7EB',
  },

  // ─── 하단 버튼 ───
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 28,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  submitBtn: {
    height: 52, backgroundColor: '#E8772E', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // ─── 시술 선택 바텀시트 ───
  sheetOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 8,
    maxHeight: '60%' as unknown as number,
  },
  pickerHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB',
    alignSelf: 'center', marginBottom: 16,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  pickerItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  pickerItemActive: {
    backgroundColor: '#EBF5FF', marginHorizontal: -20, paddingHorizontal: 20,
  },
  pickerItemText: { fontSize: 15, color: '#4B5563' },
  pickerItemTextActive: { color: '#1E5FA8', fontWeight: '600' },
  pickerCheck: { fontSize: 16, color: '#1E5FA8', fontWeight: '700' },

  // ─── 예약 확인 모달 ───
  centerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  confirmCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 24, marginHorizontal: 24, width: '88%' as unknown as number,
  },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  confirmDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  confirmRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  confirmLabel: { fontSize: 14, color: '#6B7280' },
  confirmValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  confirmButtons: { flexDirection: 'row', gap: 12 },
  confirmCancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  confirmCancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  confirmOkBtn: {
    flex: 1, height: 48, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1E5FA8',
  },
  confirmOkText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // ─── 토스트 ───
  toast: {
    position: 'absolute', bottom: 100, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#065F46', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  toastError: { backgroundColor: '#991B1B' },
  toastText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flex: 1 },
});
