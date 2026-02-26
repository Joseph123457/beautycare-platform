/**
 * 통역 서비스 화면
 *
 * 외국인 환자가 통역 서비스를 이용할 수 있는 화면.
 * 전화 통역 / 동행 통역 선택 → 통역사 목록 → 예약 → 완료 흐름.
 *
 * 단계:
 *   1. SERVICE_SELECT — 서비스 타입 선택 (전화 / 동행)
 *   2. PHONE_CONNECT — 전화 통역 연결 대기
 *   3. VISIT_LIST    — 동행 통역사 목록
 *   4. VISIT_DETAIL  — 통역사 상세
 *   5. VISIT_BOOKING — 날짜·시간·시간 선택 + 결제
 *   6. COMPLETE      — 예약 완료
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp, NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';
import { RootStackParamList, InterpreterProfile, InterpretationBooking } from '../types';

type InterpreterRoute = RouteProp<RootStackParamList, 'Interpreter'>;

// 화면 단계 정의
type ScreenStep =
  | 'SERVICE_SELECT'
  | 'PHONE_CONNECT'
  | 'VISIT_LIST'
  | 'VISIT_DETAIL'
  | 'VISIT_BOOKING'
  | 'COMPLETE';

export default function InterpreterScreen() {
  const route = useRoute<InterpreterRoute>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { convert, symbol, currency } = useCurrency();

  const { reservationId, hospitalName } = route.params;

  // ─── 공통 상태 ─────────────────────────────────────
  const [step, setStep] = useState<ScreenStep>('SERVICE_SELECT');
  const [loading, setLoading] = useState(false);

  // ─── 전화 통역 상태 ───────────────────────────────
  const [phoneWaitSeconds, setPhoneWaitSeconds] = useState(0);
  const [phoneConnecting, setPhoneConnecting] = useState(false);

  // ─── 동행 통역 상태 ───────────────────────────────
  const [interpreters, setInterpreters] = useState<InterpreterProfile[]>([]);
  const [selectedInterpreter, setSelectedInterpreter] = useState<InterpreterProfile | null>(null);

  // ─── 예약 입력 상태 ───────────────────────────────
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  // ─── 예약 완료 상태 ───────────────────────────────
  const [completedBooking, setCompletedBooking] = useState<InterpretationBooking | null>(null);

  // 가능 시간대
  const TIME_SLOTS = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00',
  ];

  // 소요 시간 옵션
  const DURATION_OPTIONS = [1, 2, 3, 4, 5];

  // 날짜 목록 (내일부터 14일)
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      key: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en', { month: 'short' }),
    };
  });

  // ─── 동행 통역사 목록 조회 ────────────────────────
  const loadInterpreters = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { language, type: 'VISIT' };
      if (selectedDate) params.date = selectedDate;

      const { data } = await client.get('/interpreters/available', { params });
      if (data.success) {
        setInterpreters(data.data || []);
      }
    } catch {
      // 에러 무시 — 빈 목록 표시
    } finally {
      setLoading(false);
    }
  }, [language, selectedDate]);

  // 동행 통역 목록 진입 시 데이터 로드
  useEffect(() => {
    if (step === 'VISIT_LIST') {
      loadInterpreters();
    }
  }, [step, loadInterpreters]);

  // ─── 전화 통역 연결 시뮬레이션 ────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (phoneConnecting) {
      setPhoneWaitSeconds(0);
      timer = setInterval(() => {
        setPhoneWaitSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phoneConnecting]);

  // 전화 통역 연결 요청
  const handlePhoneConnect = async () => {
    if (!user) {
      Alert.alert('', t('interpreter.loginRequired'));
      return;
    }
    setPhoneConnecting(true);

    try {
      // 전화 통역 예약 API 호출
      await client.post('/interpreters/book', {
        reservation_id: reservationId,
        interpreter_id: interpreters[0]?.interpreter_id, // 자동 배정
        type: 'PHONE',
        scheduled_at: new Date().toISOString(),
        duration_hours: 0.5,
      });

      // 연결 완료 시뮬레이션 (실제로는 실시간 통화 연결)
      setTimeout(() => {
        setPhoneConnecting(false);
        Alert.alert(t('interpreter.phoneConnected'), t('interpreter.phoneConnectedMsg'));
      }, 3000);
    } catch {
      setPhoneConnecting(false);
      Alert.alert('', t('interpreter.phoneError'));
    }
  };

  // ─── 동행 통역 예약 제출 ──────────────────────────
  const handleVisitBook = async () => {
    if (!user) {
      Alert.alert('', t('interpreter.loginRequired'));
      return;
    }
    if (!selectedInterpreter || !selectedDate || !selectedTime) {
      Alert.alert('', t('interpreter.selectAll'));
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await client.post('/interpreters/book', {
        reservation_id: reservationId,
        interpreter_id: selectedInterpreter.interpreter_id,
        type: 'VISIT',
        scheduled_at: `${selectedDate}T${selectedTime}:00`,
        duration_hours: durationHours,
        currency,
      });

      if (data.success) {
        setCompletedBooking({
          ...data.data.booking,
          interpreter_name: selectedInterpreter.name,
          hospital_name: hospitalName,
          payment: data.data.payment,
        });
        setStep('COMPLETE');
      } else {
        Alert.alert('', data.message || t('interpreter.bookError'));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('interpreter.bookError');
      Alert.alert('', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 평점 별 렌더링 ──────────────────────────────
  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    let stars = '';
    for (let i = 0; i < full; i++) stars += '\u2605';
    if (half) stars += '\u00BD';
    return stars;
  };

  /* ================================================================
   *  화면 렌더링 — 단계별 분기
   * ================================================================ */

  // ─── 1. 서비스 타입 선택 ──────────────────────────
  if (step === 'SERVICE_SELECT') {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.selectContainer}>
          {/* 헤더 */}
          <View style={styles.headerSection}>
            <Text style={styles.headerEmoji}>{'\u{1F30F}'}</Text>
            <Text style={styles.headerTitle}>{t('interpreter.headerTitle')}</Text>
            <Text style={styles.headerSubtitle}>{t('interpreter.headerSubtitle')}</Text>
            {hospitalName && (
              <View style={styles.hospitalBadge}>
                <Text style={styles.hospitalBadgeText}>{hospitalName}</Text>
              </View>
            )}
          </View>

          {/* 전화 통역 카드 */}
          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() => {
              // 전화 통역은 즉시 통역사 자동 배정 필요 → 먼저 목록 로드
              setStep('PHONE_CONNECT');
            }}
          >
            <View style={styles.serviceIconWrap}>
              <Text style={styles.serviceIcon}>{'\u{1F4DE}'}</Text>
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{t('interpreter.phoneType')}</Text>
              <Text style={styles.serviceDesc}>{t('interpreter.phoneDesc')}</Text>
              <View style={styles.serviceTagRow}>
                <View style={[styles.serviceTag, styles.tagGreen]}>
                  <Text style={styles.tagGreenText}>{t('interpreter.phoneTagFree')}</Text>
                </View>
                <View style={[styles.serviceTag, styles.tagBlue]}>
                  <Text style={styles.tagBlueText}>{t('interpreter.phoneTagInstant')}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.serviceArrow}>{'\u203A'}</Text>
          </TouchableOpacity>

          {/* 동행 통역 카드 */}
          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() => setStep('VISIT_LIST')}
          >
            <View style={styles.serviceIconWrap}>
              <Text style={styles.serviceIcon}>{'\u{1F9D1}\u200D\u{1F4BC}'}</Text>
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{t('interpreter.visitType')}</Text>
              <Text style={styles.serviceDesc}>{t('interpreter.visitDesc')}</Text>
              <View style={styles.serviceTagRow}>
                <View style={[styles.serviceTag, styles.tagOrange]}>
                  <Text style={styles.tagOrangeText}>{t('interpreter.visitTagPaid')}</Text>
                </View>
                <View style={[styles.serviceTag, styles.tagPurple]}>
                  <Text style={styles.tagPurpleText}>{t('interpreter.visitTagAdvance')}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.serviceArrow}>{'\u203A'}</Text>
          </TouchableOpacity>

          {/* 안내 텍스트 */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>{'\u{1F4A1}'}</Text>
            <Text style={styles.infoText}>{t('interpreter.infoTip')}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── 2. 전화 통역 연결 대기 ──────────────────────
  if (step === 'PHONE_CONNECT') {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.phoneContainer}>
          {/* 뒤로가기 */}
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('SERVICE_SELECT')}>
            <Text style={styles.backBtnText}>{'\u2190'} {t('common.cancel')}</Text>
          </TouchableOpacity>

          <View style={styles.phoneContent}>
            <Text style={styles.phoneIcon}>{'\u{1F4DE}'}</Text>
            <Text style={styles.phoneTitle}>{t('interpreter.phoneTitle')}</Text>
            <Text style={styles.phoneSubtitle}>{t('interpreter.phoneSubtitle')}</Text>

            {/* 연결 안내 카드 */}
            <View style={styles.phoneInfoCard}>
              <View style={styles.phoneStep}>
                <Text style={styles.phoneStepNum}>1</Text>
                <Text style={styles.phoneStepText}>{t('interpreter.phoneStep1')}</Text>
              </View>
              <View style={styles.phoneStep}>
                <Text style={styles.phoneStepNum}>2</Text>
                <Text style={styles.phoneStepText}>{t('interpreter.phoneStep2')}</Text>
              </View>
              <View style={styles.phoneStep}>
                <Text style={styles.phoneStepNum}>3</Text>
                <Text style={styles.phoneStepText}>{t('interpreter.phoneStep3')}</Text>
              </View>
            </View>

            {/* 예상 대기 시간 */}
            {phoneConnecting && (
              <View style={styles.waitTimeBox}>
                <ActivityIndicator color="#E8772E" />
                <Text style={styles.waitTimeText}>
                  {t('interpreter.waitTime', { seconds: phoneWaitSeconds })}
                </Text>
              </View>
            )}

            {/* 연결 버튼 */}
            <TouchableOpacity
              style={[styles.connectBtn, phoneConnecting && styles.connectBtnDisabled]}
              onPress={handlePhoneConnect}
              disabled={phoneConnecting}
            >
              {phoneConnecting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.connectBtnText}>{t('interpreter.connectBtn')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 3. 동행 통역사 목록 ─────────────────────────
  if (step === 'VISIT_LIST') {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        {/* 상단 헤더 */}
        <View style={styles.listHeader}>
          <TouchableOpacity onPress={() => setStep('SERVICE_SELECT')}>
            <Text style={styles.backBtnText}>{'\u2190'} {t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.listTitle}>{t('interpreter.visitListTitle')}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#E8772E" />
          </View>
        ) : interpreters.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>{'\u{1F614}'}</Text>
            <Text style={styles.emptyText}>{t('interpreter.noInterpreters')}</Text>
          </View>
        ) : (
          <FlatList
            data={interpreters}
            keyExtractor={(item) => String(item.interpreter_id)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.interpreterCard}
                onPress={() => {
                  setSelectedInterpreter(item);
                  setStep('VISIT_DETAIL');
                }}
              >
                {/* 아바타 */}
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* 정보 */}
                <View style={styles.interpreterInfo}>
                  <Text style={styles.interpreterName}>{item.name}</Text>

                  {/* 언어 배지 */}
                  <View style={styles.langRow}>
                    {item.languages.map((lang: string) => (
                      <View key={lang} style={styles.langBadge}>
                        <Text style={styles.langBadgeText}>{lang.toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>

                  {/* 평점 */}
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingStars}>{renderStars(item.rating)}</Text>
                    <Text style={styles.ratingText}>
                      {item.rating.toFixed(1)} ({item.review_count})
                    </Text>
                  </View>
                </View>

                {/* 시간당 요금 */}
                <View style={styles.priceCol}>
                  <Text style={styles.priceAmount}>{convert(item.hourly_rate)}</Text>
                  <Text style={styles.priceUnit}>/{t('interpreter.perHour')}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ─── 4. 통역사 상세 ──────────────────────────────
  if (step === 'VISIT_DETAIL' && selectedInterpreter) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* 뒤로가기 */}
          <TouchableOpacity style={styles.backBtnPad} onPress={() => setStep('VISIT_LIST')}>
            <Text style={styles.backBtnText}>{'\u2190'} {t('interpreter.visitListTitle')}</Text>
          </TouchableOpacity>

          {/* 프로필 카드 */}
          <View style={styles.detailProfileCard}>
            <View style={styles.detailAvatar}>
              <Text style={styles.detailAvatarText}>
                {selectedInterpreter.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.detailName}>{selectedInterpreter.name}</Text>

            {/* 언어 */}
            <View style={[styles.langRow, { justifyContent: 'center', marginTop: 8 }]}>
              {selectedInterpreter.languages.map((lang: string) => (
                <View key={lang} style={styles.langBadge}>
                  <Text style={styles.langBadgeText}>{lang.toUpperCase()}</Text>
                </View>
              ))}
            </View>

            {/* 평점 + 리뷰 수 */}
            <View style={[styles.ratingRow, { justifyContent: 'center', marginTop: 10 }]}>
              <Text style={[styles.ratingStars, { fontSize: 18 }]}>
                {renderStars(selectedInterpreter.rating)}
              </Text>
              <Text style={styles.ratingText}>
                {selectedInterpreter.rating.toFixed(1)} ({selectedInterpreter.review_count} {t('interpreter.reviews')})
              </Text>
            </View>

            {/* 요금 */}
            <View style={styles.detailPriceRow}>
              <Text style={styles.detailPriceLabel}>{t('interpreter.hourlyRate')}</Text>
              <Text style={styles.detailPriceValue}>
                {convert(selectedInterpreter.hourly_rate)} / {t('interpreter.perHour')}
              </Text>
            </View>
          </View>

          {/* 통역 유형 */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>{t('interpreter.serviceType')}</Text>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoIcon}>
                {selectedInterpreter.available_type === 'PHONE' ? '\u{1F4DE}' :
                 selectedInterpreter.available_type === 'VISIT' ? '\u{1F9D1}\u200D\u{1F4BC}' :
                 '\u{1F4DE} + \u{1F9D1}\u200D\u{1F4BC}'}
              </Text>
              <Text style={styles.detailInfoText}>
                {selectedInterpreter.available_type === 'BOTH'
                  ? t('interpreter.typeBoth')
                  : selectedInterpreter.available_type === 'PHONE'
                  ? t('interpreter.phoneType')
                  : t('interpreter.visitType')}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* 하단 예약 버튼 */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomSummary}>
            <Text style={styles.bottomLabel}>{t('interpreter.hourlyRate')}</Text>
            <Text style={styles.bottomAmount}>
              {convert(selectedInterpreter.hourly_rate)}/{t('interpreter.perHour')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setStep('VISIT_BOOKING')}
          >
            <Text style={styles.primaryBtnText}>{t('interpreter.bookNow')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 5. 동행 통역 예약 (날짜/시간/시간 선택) ─────
  if (step === 'VISIT_BOOKING' && selectedInterpreter) {
    const totalFee = selectedInterpreter.hourly_rate * durationHours;

    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* 뒤로가기 */}
          <TouchableOpacity style={styles.backBtnPad} onPress={() => setStep('VISIT_DETAIL')}>
            <Text style={styles.backBtnText}>{'\u2190'} {selectedInterpreter.name}</Text>
          </TouchableOpacity>

          {/* 통역사 요약 */}
          <View style={styles.bookingSummaryCard}>
            <View style={styles.bookingSummaryRow}>
              <View style={styles.miniAvatar}>
                <Text style={styles.miniAvatarText}>
                  {selectedInterpreter.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.bookingSummaryName}>{selectedInterpreter.name}</Text>
                <Text style={styles.bookingSummaryHospital}>{hospitalName}</Text>
              </View>
            </View>
          </View>

          {/* 날짜 선택 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('interpreter.selectDate')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {dates.map((d) => {
                const isActive = selectedDate === d.key;
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.dateChip, isActive && styles.dateChipActive]}
                    onPress={() => setSelectedDate(d.key)}
                  >
                    <Text style={[styles.dateDay, isActive && { color: '#FFF' }]}>{d.day}</Text>
                    <Text style={[styles.dateNum, isActive && { color: '#FFF' }]}>{d.date}</Text>
                    <Text style={[styles.dateMonth, isActive && { color: '#FFF' }]}>{d.month}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 시간 선택 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('interpreter.selectTime')}</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((time) => {
                const isActive = selectedTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeChip, isActive && styles.timeChipActive]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[styles.timeText, isActive && { color: '#FFF' }]}>{time}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 소요 시간 선택 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('interpreter.selectDuration')}</Text>
            <View style={styles.timeGrid}>
              {DURATION_OPTIONS.map((hr) => {
                const isActive = durationHours === hr;
                return (
                  <TouchableOpacity
                    key={hr}
                    style={[styles.durationChip, isActive && styles.durationChipActive]}
                    onPress={() => setDurationHours(hr)}
                  >
                    <Text style={[styles.durationText, isActive && { color: '#FFF' }]}>
                      {hr}{t('interpreter.hours')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 요금 요약 */}
          <View style={styles.section}>
            <View style={styles.feeSummaryCard}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>
                  {convert(selectedInterpreter.hourly_rate)} x {durationHours}{t('interpreter.hours')}
                </Text>
                <Text style={styles.feeValue}>{convert(totalFee)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.feeRow}>
                <Text style={styles.feeTotalLabel}>{t('interpreter.totalFee')}</Text>
                <Text style={styles.feeTotalValue}>{convert(totalFee)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* 하단 예약 버튼 */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomSummary}>
            <Text style={styles.bottomLabel}>{t('interpreter.totalFee')}</Text>
            <Text style={styles.bottomAmount}>{convert(totalFee)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
            onPress={handleVisitBook}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>{t('interpreter.confirmBooking')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 6. 예약 완료 ────────────────────────────────
  if (step === 'COMPLETE') {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <ScrollView contentContainerStyle={styles.completeContainer}>
          {/* 완료 아이콘 */}
          <Text style={styles.completeIcon}>{'\u2705'}</Text>
          <Text style={styles.completeTitle}>{t('interpreter.completeTitle')}</Text>
          <Text style={styles.completeSubtitle}>{t('interpreter.completeSubtitle')}</Text>

          {/* 예약 요약 카드 */}
          <View style={styles.receiptCard}>
            {completedBooking && (
              <>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('interpreter.interpreterLabel')}</Text>
                  <Text style={styles.receiptValue}>
                    {completedBooking.interpreter_name}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('interpreter.hospitalLabel')}</Text>
                  <Text style={styles.receiptValue}>{hospitalName}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('interpreter.dateLabel')}</Text>
                  <Text style={styles.receiptValue}>
                    {new Date(completedBooking.scheduled_at).toLocaleDateString('en', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('interpreter.durationLabel')}</Text>
                  <Text style={styles.receiptValue}>
                    {completedBooking.duration_hours}{t('interpreter.hours')}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('interpreter.totalFee')}</Text>
                  <Text style={styles.receiptTotal}>
                    {convert(completedBooking.total_fee)}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* 연동 표시 */}
          <View style={styles.linkedNotice}>
            <Text style={styles.linkedIcon}>{'\u{1F517}'}</Text>
            <Text style={styles.linkedText}>{t('interpreter.linkedToReservation')}</Text>
          </View>

          {/* 버튼 */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'MyReservations' } as any)}
          >
            <Text style={styles.primaryBtnText}>{t('interpreter.viewBookings')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.secondaryBtnText}>{t('interpreter.goHome')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 폴백
  return null;
}

/* ================================================================
 *  스타일
 * ================================================================ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // ─── 서비스 선택 ─────────────────────────────────
  selectContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },

  headerSection: { alignItems: 'center', marginBottom: 28 },
  headerEmoji: { fontSize: 48, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937', textAlign: 'center' },
  headerSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  hospitalBadge: {
    marginTop: 12, backgroundColor: '#FFF7ED', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FDBA74',
  },
  hospitalBadgeText: { fontSize: 13, fontWeight: '600', color: '#C2410C' },

  // 서비스 카드
  serviceCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  serviceIconWrap: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  serviceIcon: { fontSize: 26 },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  serviceDesc: { fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 17 },
  serviceArrow: { fontSize: 24, color: '#D1D5DB', fontWeight: '300' },

  // 태그
  serviceTagRow: { flexDirection: 'row', marginTop: 8, gap: 6 },
  serviceTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagGreen: { backgroundColor: '#F0FDF4' },
  tagGreenText: { fontSize: 11, fontWeight: '600', color: '#16A34A' },
  tagBlue: { backgroundColor: '#EFF6FF' },
  tagBlueText: { fontSize: 11, fontWeight: '600', color: '#2563EB' },
  tagOrange: { backgroundColor: '#FFF7ED' },
  tagOrangeText: { fontSize: 11, fontWeight: '600', color: '#C2410C' },
  tagPurple: { backgroundColor: '#FAF5FF' },
  tagPurpleText: { fontSize: 11, fontWeight: '600', color: '#7C3AED' },

  // 안내 박스
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginTop: 8,
  },
  infoIcon: { fontSize: 16, marginRight: 10, marginTop: 1 },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 19 },

  // ─── 전화 통역 ──────────────────────────────────
  phoneContainer: { flex: 1, paddingHorizontal: 20 },
  phoneContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  phoneIcon: { fontSize: 60, marginBottom: 16 },
  phoneTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginBottom: 6 },
  phoneSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  phoneInfoCard: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24,
  },
  phoneStep: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  phoneStepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8772E',
    color: '#FFFFFF', fontSize: 14, fontWeight: '700',
    textAlign: 'center', lineHeight: 28, marginRight: 12,
    overflow: 'hidden',
  },
  phoneStepText: { flex: 1, fontSize: 14, color: '#4B5563', lineHeight: 20 },

  waitTimeBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF7ED', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
    marginBottom: 20,
  },
  waitTimeText: { fontSize: 14, color: '#C2410C', fontWeight: '600', marginLeft: 10 },

  connectBtn: {
    width: '100%', height: 54, backgroundColor: '#E8772E', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  connectBtnDisabled: { backgroundColor: '#FDBA74', opacity: 0.7 },
  connectBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // ─── 통역사 목록 ────────────────────────────────
  listHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  listTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginLeft: 12 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },

  interpreterCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 14, marginTop: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#E8772E' },
  interpreterInfo: { flex: 1 },
  interpreterName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },

  langRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  langBadge: {
    backgroundColor: '#EFF6FF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  langBadgeText: { fontSize: 10, fontWeight: '700', color: '#2563EB' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingStars: { fontSize: 13, color: '#F59E0B', marginRight: 4 },
  ratingText: { fontSize: 12, color: '#9CA3AF' },

  priceCol: { alignItems: 'flex-end' },
  priceAmount: { fontSize: 16, fontWeight: '800', color: '#E8772E' },
  priceUnit: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // ─── 통역사 상세 ────────────────────────────────
  backBtn: { paddingVertical: 12 },
  backBtnPad: { paddingHorizontal: 20, paddingVertical: 12 },
  backBtnText: { fontSize: 15, color: '#E8772E', fontWeight: '600' },

  detailProfileCard: {
    alignItems: 'center', backgroundColor: '#FFFFFF',
    marginHorizontal: 20, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  detailAvatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  detailAvatarText: { fontSize: 30, fontWeight: '700', color: '#E8772E' },
  detailName: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  detailPriceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', marginTop: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  detailPriceLabel: { fontSize: 14, color: '#6B7280' },
  detailPriceValue: { fontSize: 18, fontWeight: '800', color: '#E8772E' },

  detailSection: { paddingHorizontal: 20, marginTop: 20 },
  detailSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  detailInfoRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  detailInfoIcon: { fontSize: 20, marginRight: 12 },
  detailInfoText: { fontSize: 14, color: '#4B5563' },

  // ─── 예약 폼 ────────────────────────────────────
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 10 },

  bookingSummaryCard: {
    marginHorizontal: 20, marginTop: 4, backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  bookingSummaryRow: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  miniAvatarText: { fontSize: 15, fontWeight: '700', color: '#E8772E' },
  bookingSummaryName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  bookingSummaryHospital: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  // 날짜 칩
  dateChip: {
    width: 60, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  dateChipActive: { backgroundColor: '#E8772E', borderColor: '#E8772E' },
  dateDay: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  dateNum: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginVertical: 2 },
  dateMonth: { fontSize: 10, fontWeight: '500', color: '#9CA3AF' },

  // 시간 칩
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  timeChipActive: { backgroundColor: '#E8772E', borderColor: '#E8772E' },
  timeText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },

  // 소요 시간 칩
  durationChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  durationChipActive: { backgroundColor: '#E8772E', borderColor: '#E8772E' },
  durationText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },

  // 요금 요약
  feeSummaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  feeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginVertical: 4,
  },
  feeLabel: { fontSize: 14, color: '#6B7280' },
  feeValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  feeTotalLabel: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  feeTotalValue: { fontSize: 20, fontWeight: '800', color: '#E8772E' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

  // ─── 하단 바 ────────────────────────────────────
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  bottomSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  bottomLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  bottomAmount: { fontSize: 18, fontWeight: '800', color: '#E8772E' },

  primaryBtn: {
    width: '100%', height: 52, backgroundColor: '#E8772E', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  secondaryBtn: {
    width: '100%', height: 48, backgroundColor: '#F3F4F6', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: '#4B5563' },

  // ─── 완료 화면 ──────────────────────────────────
  completeContainer: {
    flexGrow: 1, paddingHorizontal: 20, paddingTop: 40, alignItems: 'center',
  },
  completeIcon: { fontSize: 60, marginBottom: 16 },
  completeTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
  completeSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },

  receiptCard: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16,
  },
  receiptRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginVertical: 4,
  },
  receiptLabel: { fontSize: 13, color: '#9CA3AF' },
  receiptValue: { fontSize: 14, fontWeight: '600', color: '#1F2937', maxWidth: '60%', textAlign: 'right' },
  receiptTotal: { fontSize: 16, fontWeight: '800', color: '#E8772E' },

  linkedNotice: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12,
    marginBottom: 24, width: '100%',
  },
  linkedIcon: { fontSize: 16, marginRight: 8 },
  linkedText: { fontSize: 13, color: '#166534', flex: 1 },
});
