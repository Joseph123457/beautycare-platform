/**
 * 관광 가이드 화면
 * 의료관광 핫스팟, 교통, 긴급 연락처 등 외국인 필수 정보
 */
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

// ─── 섹션 카드 컴포넌트 ────────────────────────────────

function InfoCard({ icon, title, desc, onPress }: {
  icon: string; title: string; desc: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.infoCard}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoBody}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
      </View>
      {onPress && <Text style={styles.infoArrow}>{'\u203A'}</Text>}
    </TouchableOpacity>
  );
}

export default function TourGuideScreen() {
  const { t } = useTranslation();

  // 전화 걸기
  const callNumber = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('tourGuide.title')}</Text>
        </View>

        {/* 의료관광 핫스팟 */}
        <Text style={styles.sectionTitle}>{t('tourGuide.medicalTourism')}</Text>

        <InfoCard
          icon={'\u2728'}
          title={t('tourGuide.gangnam')}
          desc={t('tourGuide.gangnamDesc')}
        />
        <InfoCard
          icon={'\u{1F9F4}'}
          title={t('tourGuide.myeongdong')}
          desc={t('tourGuide.myeongdongDesc')}
        />
        <InfoCard
          icon={'\u{1F484}'}
          title={t('tourGuide.apgujeong')}
          desc={t('tourGuide.apgujeongDesc')}
        />

        {/* 교통 안내 */}
        <Text style={styles.sectionTitle}>{t('tourGuide.gettingAround')}</Text>

        <InfoCard
          icon={'\u2708\uFE0F'}
          title={t('tourGuide.airports')}
          desc={t('tourGuide.airportsDesc')}
        />
        <InfoCard
          icon={'\u{1F695}'}
          title={t('tourGuide.taxi')}
          desc={t('tourGuide.taxiDesc')}
        />
        <InfoCard
          icon={'\u{1F687}'}
          title={t('tourGuide.subway')}
          desc={t('tourGuide.subwayDesc')}
        />

        {/* 긴급 연락처 */}
        <Text style={styles.sectionTitle}>{t('tourGuide.emergency')}</Text>

        <View style={styles.emergencySection}>
          <TouchableOpacity
            style={styles.emergencyCard}
            onPress={() => callNumber('119')}
          >
            <Text style={styles.emergencyIcon}>{'\u{1F691}'}</Text>
            <Text style={styles.emergencyLabel}>{t('tourGuide.emergencyNumber')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emergencyCard}
            onPress={() => callNumber('1330')}
          >
            <Text style={styles.emergencyIcon}>{'\u2139\uFE0F'}</Text>
            <Text style={styles.emergencyLabel}>{t('tourGuide.touristHotline')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emergencyCard}
            onPress={() => callNumber('112')}
          >
            <Text style={styles.emergencyIcon}>{'\u{1F46E}'}</Text>
            <Text style={styles.emergencyLabel}>{t('tourGuide.policeNumber')}</Text>
          </TouchableOpacity>
        </View>

        {/* 유용한 팁 */}
        <View style={styles.tipBox}>
          <Text style={styles.tipIcon}>{'\u{1F4A1}'}</Text>
          <Text style={styles.tipText}>
            Download KakaoMap or Naver Map for navigation. Google Maps has limited coverage in Korea.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },

  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: '#1F2937',
    paddingHorizontal: 20, marginTop: 24, marginBottom: 12,
  },

  // 정보 카드
  infoCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10, padding: 16,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  infoIcon: { fontSize: 28, marginRight: 14 },
  infoBody: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  infoDesc: { fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 18 },
  infoArrow: { fontSize: 20, color: '#9CA3AF' },

  // 긴급 연락처
  emergencySection: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, gap: 10,
  },
  emergencyCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    backgroundColor: '#FEE2E2', borderRadius: 14, borderWidth: 1, borderColor: '#FECACA',
  },
  emergencyIcon: { fontSize: 24, marginBottom: 6 },
  emergencyLabel: { fontSize: 11, fontWeight: '700', color: '#DC2626', textAlign: 'center' },

  // 팁 박스
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: 16, marginTop: 24, padding: 16,
    backgroundColor: '#FFF7ED', borderRadius: 12,
    borderWidth: 1, borderColor: '#FED7AA',
  },
  tipIcon: { fontSize: 20, marginRight: 10 },
  tipText: { flex: 1, fontSize: 13, color: '#9A3412', lineHeight: 20, fontWeight: '500' },
});
