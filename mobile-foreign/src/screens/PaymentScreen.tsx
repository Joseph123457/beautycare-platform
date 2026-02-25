/**
 * Stripe 결제 화면
 * 외국인 환자의 예약금(deposit) 결제를 처리한다.
 *
 * 흐름:
 *   1. 결제 금액 확인 (시술명, 예약일시, 예약금)
 *   2. 카드 정보 입력 (Stripe CardField)
 *   3. confirmPayment → 결제 완료
 *   4. 완료 화면 (영수증 안내 + 예약 확인서 버튼)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp, NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { CardField, useConfirmPayment } from '@stripe/stripe-react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import { RootStackParamList } from '../types';

type PaymentRoute = RouteProp<RootStackParamList, 'Payment'>;

// 결제 단계
type PaymentStep = 'CONFIRM' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

export default function PaymentScreen() {
  const route = useRoute<PaymentRoute>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currency, symbol, convert, getRateDisplay } = useCurrency();
  const { confirmPayment, loading: stripeLoading } = useConfirmPayment();

  const {
    reservationId,
    treatmentName,
    hospitalName,
    reservedAt,
    depositKrw,
  } = route.params;

  // ─── 상태 ───────────────────────────────────────────
  const [step, setStep] = useState<PaymentStep>('CONFIRM');
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [depositForeign, setDepositForeign] = useState(0);
  const [depositKrwAmount, setDepositKrwAmount] = useState(depositKrw || 0);
  const [cardComplete, setCardComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ─── PaymentIntent 생성 ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.post('/payments/stripe/create-intent', {
          reservation_id: reservationId,
          currency,
        });

        if (data.success) {
          setClientSecret(data.data.client_secret);
          setPaymentIntentId(data.data.payment_intent_id);
          setDepositForeign(data.data.deposit_foreign);
          setDepositKrwAmount(data.data.deposit_krw);
        } else {
          setErrorMessage(data.message || t('payment.errorGeneric'));
          setStep('ERROR');
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || t('payment.errorGeneric');
        setErrorMessage(msg);
        setStep('ERROR');
      } finally {
        setLoading(false);
      }
    })();
  }, [reservationId, currency]);

  // ─── 예약일시 포맷 ─────────────────────────────────
  const formattedDate = useCallback(() => {
    const d = new Date(reservedAt);
    return d.toLocaleDateString('en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [reservedAt]);

  // ─── 결제 처리 ─────────────────────────────────────
  const handlePay = async () => {
    if (!cardComplete) {
      Alert.alert('', t('payment.enterCard'));
      return;
    }
    if (!clientSecret) {
      Alert.alert('', t('payment.errorGeneric'));
      return;
    }

    setStep('PROCESSING');

    try {
      const { paymentIntent, error } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            email: user?.email,
            name: user?.name,
          },
        },
      });

      if (error) {
        setErrorMessage(error.localizedMessage || error.message || t('payment.errorGeneric'));
        setStep('ERROR');
        return;
      }

      if (paymentIntent?.status === 'Succeeded') {
        setStep('SUCCESS');
      } else {
        // 일부 카드는 추가 인증 필요 → Stripe SDK가 자동 처리
        setErrorMessage(t('payment.errorGeneric'));
        setStep('ERROR');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || t('payment.errorGeneric'));
      setStep('ERROR');
    }
  };

  // ─── 로딩 화면 ─────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#E8772E" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 결제 완료 화면 ────────────────────────────────
  if (step === 'SUCCESS') {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <ScrollView contentContainerStyle={styles.successContainer}>
          <View style={styles.successIconWrap}>
            <Text style={styles.successIcon}>{'\u2705'}</Text>
          </View>
          <Text style={styles.successTitle}>{t('payment.successTitle')}</Text>
          <Text style={styles.successSubtitle}>{t('payment.successSubtitle')}</Text>

          {/* 결제 요약 */}
          <View style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t('payment.clinic')}</Text>
              <Text style={styles.receiptValue}>{hospitalName}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t('payment.treatment')}</Text>
              <Text style={styles.receiptValue}>{treatmentName}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t('payment.date')}</Text>
              <Text style={styles.receiptValue}>{formattedDate()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t('payment.depositPaid')}</Text>
              <Text style={styles.receiptTotal}>
                {symbol}{depositForeign.toLocaleString()} ({'\u20A9'}{depositKrwAmount.toLocaleString()})
              </Text>
            </View>
          </View>

          {/* 이메일 안내 */}
          <View style={styles.emailNotice}>
            <Text style={styles.emailNoticeIcon}>{'\u{1F4E7}'}</Text>
            <Text style={styles.emailNoticeText}>{t('payment.receiptEmail')}</Text>
          </View>

          {/* 버튼 */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'MyReservations' } as any)}
          >
            <Text style={styles.primaryBtnText}>{t('payment.viewBooking')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.secondaryBtnText}>{t('payment.goHome')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── 에러 화면 ─────────────────────────────────────
  if (step === 'ERROR') {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>{'\u274C'}</Text>
          <Text style={styles.errorTitle}>{t('payment.errorTitle')}</Text>
          <Text style={styles.errorMsg}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setStep('CONFIRM');
              setErrorMessage('');
            }}
          >
            <Text style={styles.primaryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 결제 진행 중 화면 ─────────────────────────────
  if (step === 'PROCESSING') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#E8772E" />
          <Text style={styles.loadingText}>{t('payment.processing')}</Text>
          <Text style={styles.loadingSubtext}>{t('payment.doNotClose')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 결제 확인 + 카드 입력 화면 ───────────────────
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* 1. 결제 금액 확인 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('payment.orderSummary')}</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.hospitalLabel}>{hospitalName}</Text>
            <Text style={styles.treatmentLabel}>{treatmentName}</Text>
            <Text style={styles.dateLabel}>{formattedDate()}</Text>

            <View style={styles.divider} />

            {/* 예약금 표시 */}
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>{t('payment.deposit')}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amountForeign}>
                  {symbol}{depositForeign.toLocaleString()}
                </Text>
                <Text style={styles.amountKrw}>
                  ({'\u20A9'}{depositKrwAmount.toLocaleString()})
                </Text>
              </View>
            </View>

            {/* 환율 기준 */}
            <View style={styles.rateRow}>
              <Text style={styles.rateIcon}>{'\u{1F4B1}'}</Text>
              <Text style={styles.rateText}>
                {t('payment.exchangeRate')}: {getRateDisplay()}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. 카드 정보 입력 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('payment.cardInfo')}</Text>
          <View style={styles.cardFieldWrap}>
            <Text style={styles.cardFieldLabel}>
              {'\u{1F4B3}'} {t('payment.creditDebit')}
            </Text>
            <CardField
              postalCodeEnabled={false}
              placeholders={{
                number: '4242 4242 4242 4242',
              }}
              cardStyle={{
                backgroundColor: '#FFFFFF',
                textColor: '#1F2937',
                placeholderColor: '#9CA3AF',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 10,
                fontSize: 15,
              }}
              style={styles.cardField}
              onCardChange={(details) => {
                setCardComplete(details.complete);
              }}
            />
          </View>

          {/* 보안 안내 */}
          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>{'\u{1F512}'}</Text>
            <Text style={styles.securityText}>{t('payment.secureNote')}</Text>
          </View>
        </View>

        {/* 3. 환불 정책 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('payment.refundPolicy')}</Text>
          <View style={styles.policyCard}>
            <View style={styles.policyRow}>
              <Text style={styles.policyDot}>{'\u{1F7E2}'}</Text>
              <Text style={styles.policyText}>{t('payment.refund100')}</Text>
            </View>
            <View style={styles.policyRow}>
              <Text style={styles.policyDot}>{'\u{1F7E1}'}</Text>
              <Text style={styles.policyText}>{t('payment.refund50')}</Text>
            </View>
            <View style={styles.policyRow}>
              <Text style={styles.policyDot}>{'\u{1F534}'}</Text>
              <Text style={styles.policyText}>{t('payment.refund0')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 하단: 결제 버튼 */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomSummary}>
          <Text style={styles.bottomLabel}>{t('payment.total')}</Text>
          <Text style={styles.bottomAmount}>
            {symbol}{depositForeign.toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.payBtn,
            (!cardComplete || stripeLoading) && styles.payBtnDisabled,
          ]}
          onPress={handlePay}
          disabled={!cardComplete || stripeLoading}
        >
          {stripeLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.payBtnText}>
              {t('payment.payNow', { amount: `${symbol}${depositForeign.toLocaleString()}` })}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── 스타일 ──────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // 로딩
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 15, fontWeight: '600', color: '#4B5563', marginTop: 16 },
  loadingSubtext: { fontSize: 13, color: '#9CA3AF', marginTop: 6 },

  // 섹션
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },

  // 주문 요약 카드
  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  hospitalLabel: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  treatmentLabel: { fontSize: 14, color: '#4B5563', marginTop: 4 },
  dateLabel: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },

  amountRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  amountLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  amountForeign: { fontSize: 22, fontWeight: '800', color: '#E8772E' },
  amountKrw: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },

  rateRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12,
    backgroundColor: '#FFF7ED', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  rateIcon: { fontSize: 14, marginRight: 6 },
  rateText: { fontSize: 12, color: '#C2410C', fontWeight: '500' },

  // 카드 입력
  cardFieldWrap: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardFieldLabel: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  cardField: { width: '100%', height: 50 },

  securityNote: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10,
    paddingHorizontal: 4,
  },
  securityIcon: { fontSize: 13, marginRight: 6 },
  securityText: { fontSize: 12, color: '#9CA3AF' },

  // 환불 정책
  policyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  policyRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  policyDot: { fontSize: 10, marginRight: 8 },
  policyText: { fontSize: 13, color: '#4B5563', flex: 1 },

  // 하단 결제 바
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
  payBtn: {
    height: 52, backgroundColor: '#E8772E', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  payBtnDisabled: { backgroundColor: '#FDBA74', opacity: 0.7 },
  payBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // 결제 완료
  successContainer: {
    flexGrow: 1, paddingHorizontal: 20, paddingTop: 40, alignItems: 'center',
  },
  successIconWrap: { marginBottom: 16 },
  successIcon: { fontSize: 60 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },

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

  emailNotice: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12,
    marginBottom: 24, width: '100%',
  },
  emailNoticeIcon: { fontSize: 16, marginRight: 8 },
  emailNoticeText: { fontSize: 13, color: '#166534', flex: 1 },

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

  // 에러
  errorContainer: {
    flex: 1, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center',
  },
  errorIcon: { fontSize: 50, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  errorMsg: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
});
