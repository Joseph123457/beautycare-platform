/**
 * 예약 화면
 * 날짜·시간·시술 선택 + 환자 정보 입력 + 예약 확인
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform, Switch, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Treatment, RootStackParamList } from '../types';
import { useCurrency } from '../hooks/useCurrency';

type BookingRoute = RouteProp<RootStackParamList, 'Booking'>;

// 가능 시간대
const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00',
];

export default function BookingScreen() {
  const route = useRoute<BookingRoute>();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { convert } = useCurrency();

  const { hospitalId, hospitalName } = route.params;

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [selectedTreatment, setSelectedTreatment] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [patientName, setPatientName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [needInterpreter, setNeedInterpreter] = useState(false);
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // 시술 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get(`/hospitals/${hospitalId}`);
        setTreatments(data.data?.treatments || []);
      } catch {
        // 에러 무시
      } finally {
        setLoading(false);
      }
    })();
  }, [hospitalId]);

  // 날짜 목록 (오늘부터 14일)
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      key: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en', { month: 'short' }),
    };
  });

  // 예약 제출
  const handleSubmit = async () => {
    if (!selectedTreatment || !selectedDate || !selectedTime) {
      Alert.alert('', 'Please select treatment, date, and time.');
      return;
    }
    if (!patientName.trim()) {
      Alert.alert('', 'Please enter patient name.');
      return;
    }

    setSubmitting(true);
    try {
      const treatmentItem = treatments.find((tr) => tr.treatment_id === selectedTreatment);
      await client.post('/reservations', {
        hospital_id: hospitalId,
        treatment_name: treatmentItem?.name || '',
        reserved_at: `${selectedDate}T${selectedTime}:00`,
        memo: notes || null,
        need_interpreter: needInterpreter,
        insurance_number: insuranceNumber || null,
      });

      Alert.alert(t('booking.success'), t('booking.successMsg'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to book. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#E8772E" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 병원명 */}
        <View style={styles.hospitalHeader}>
          <Text style={styles.hospitalName}>{hospitalName}</Text>
        </View>

        {/* 시술 선택 */}
        {treatments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('booking.selectTreatment')}</Text>
            {treatments.map((tr) => {
              const isActive = selectedTreatment === tr.treatment_id;
              return (
                <TouchableOpacity
                  key={tr.treatment_id}
                  style={[styles.treatmentOption, isActive && styles.treatmentOptionActive]}
                  onPress={() => setSelectedTreatment(tr.treatment_id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.treatmentName, isActive && { color: '#C2410C' }]}>
                      {tr.name_en || tr.name}
                    </Text>
                    <Text style={styles.treatmentMeta}>
                      {t('hospital.duration', { min: tr.duration_min })}
                    </Text>
                  </View>
                  <Text style={[styles.treatmentPrice, isActive && { color: '#C2410C' }]}>
                    {convert(tr.price)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 날짜 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.selectDate')}</Text>
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
          <Text style={styles.sectionTitle}>{t('booking.selectTime')}</Text>
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

        {/* 환자 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.patientName')}</Text>
          <TextInput
            style={styles.input}
            value={patientName}
            onChangeText={setPatientName}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{t('booking.phone')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+82-10-1234-5678"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{t('booking.notes')}</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('booking.notesPlaceholder')}
            placeholderTextColor="#9CA3AF"
            multiline
          />
        </View>

        {/* 외국인 전용: 통역·여권·보험 */}
        <View style={styles.section}>
          {/* 통역 동행 옵션 */}
          <View style={styles.interpreterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{t('hospital.interpreterOption')}</Text>
              <Text style={styles.interpreterDesc}>{t('hospital.interpreterOptionDesc')}</Text>
            </View>
            <Switch
              value={needInterpreter}
              onValueChange={setNeedInterpreter}
              trackColor={{ false: '#D1D5DB', true: '#FDBA74' }}
              thumbColor={needInterpreter ? '#E8772E' : '#F3F4F6'}
            />
          </View>

          {/* 여행 보험 번호 */}
          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>{t('hospital.insuranceNumber')}</Text>
          <TextInput
            style={styles.input}
            value={insuranceNumber}
            onChangeText={setInsuranceNumber}
            placeholder={t('hospital.insurancePlaceholder')}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </ScrollView>

      {/* 하단: 예약 확인 버튼 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>{t('booking.submit')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  hospitalHeader: { padding: 20, paddingBottom: 8 },
  hospitalName: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 10 },

  // 시술 옵션
  treatmentOption: {
    flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  treatmentOptionActive: { borderColor: '#E8772E', backgroundColor: '#FFF7ED' },
  treatmentName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  treatmentMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  treatmentPrice: { fontSize: 15, fontWeight: '800', color: '#E8772E' },

  // 날짜
  dateChip: {
    width: 60, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  dateChipActive: { backgroundColor: '#E8772E', borderColor: '#E8772E' },
  dateDay: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  dateNum: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginVertical: 2 },
  dateMonth: { fontSize: 10, fontWeight: '500', color: '#9CA3AF' },

  // 시간
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  timeChipActive: { backgroundColor: '#E8772E', borderColor: '#E8772E' },
  timeText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },

  // 입력
  input: {
    height: 46, backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingHorizontal: 14, fontSize: 14, color: '#1F2937',
    borderWidth: 1, borderColor: '#E5E7EB',
  },

  // 통역 옵션
  interpreterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  interpreterDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  // 하단
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  submitBtn: {
    height: 52, backgroundColor: '#E8772E', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
