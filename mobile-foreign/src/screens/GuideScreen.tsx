/**
 * 의료관광 가이드 화면
 *
 * 외국인 의료관광 환자를 위한 종합 가이드 탭 메인.
 * 카테고리별 가이드 아티클, 회복 숙소, 체크리스트를 제공한다.
 *
 * 구성:
 *   1. 상단 배너 (한국 의료관광 완벽 가이드)
 *   2. 카테고리 가로 스크롤
 *   3. 추천 아티클 카드
 *   4. 회복 숙소 섹션
 *   5. 시술 전 체크리스트 (진행률 프로그레스 바)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';
import { RootStackParamList } from '../types';

type Nav = StackNavigationProp<RootStackParamList>;

// 카테고리 정의
const CATEGORIES = [
  { key: '',              labelKey: 'guide.catAll',           icon: '\u{1F4D6}' },
  { key: 'VISA',          labelKey: 'guide.catVisa',          icon: '\u2708\uFE0F' },
  { key: 'PROCEDURE',     labelKey: 'guide.catProcedure',     icon: '\u{1F3E5}' },
  { key: 'ACCOMMODATION', labelKey: 'guide.catAccommodation', icon: '\u{1F3E8}' },
  { key: 'TRANSPORT',     labelKey: 'guide.catTransport',     icon: '\u{1F687}' },
  { key: 'INSURANCE',     labelKey: 'guide.catInsurance',     icon: '\u{1F48A}' },
  { key: 'RECOVERY',      labelKey: 'guide.catRecovery',      icon: '\u2705' },
];

// 아티클 타입
interface GuideArticle {
  article_id: number;
  category: string;
  title: string;
  thumbnail_url: string | null;
  tags: string[];
  view_count: number;
  published_at: string;
}

// 회복 숙소 타입
interface RecoveryHouse {
  house_id: number;
  name: string;
  address: string;
  description: string;
  price_per_night: number;
  amenities: string[];
  rating: number;
  review_count: number;
  distance_km?: number;
}

// 체크리스트 아이템 타입
interface ChecklistItem {
  id: number;
  text: string;
  icon: string;
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

interface ChecklistData {
  before: ChecklistSection;
  dayOf: ChecklistSection;
  after: ChecklistSection;
}

// AsyncStorage 키
const CHECKLIST_KEY = 'guideChecklistCompleted';

// 카테고리별 아이콘 매핑
const CATEGORY_ICONS: Record<string, string> = {
  VISA: '\u2708\uFE0F',
  RECOVERY: '\u{1F3E5}',
  TRANSPORT: '\u{1F687}',
  ACCOMMODATION: '\u{1F3E8}',
  INSURANCE: '\u{1F48A}',
  PROCEDURE: '\u{1F489}',
};

// 예상 읽기 시간 계산 (조회수 기반 근사)
function estimateReadTime(viewCount: number): string {
  // 간단한 근사: 3~8분
  const min = Math.max(3, Math.min(8, Math.round(viewCount / 50) + 3));
  return `${min} min`;
}

export default function GuideScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { convert } = useCurrency();

  // ─── 상태 ─────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState('');
  const [articles, setArticles] = useState<GuideArticle[]>([]);
  const [houses, setHouses] = useState<RecoveryHouse[]>([]);
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingHouses, setLoadingHouses] = useState(true);
  const [loadingChecklist, setLoadingChecklist] = useState(true);

  // ─── 체크리스트 완료 항목 로드 ────────────────────
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(CHECKLIST_KEY);
        if (saved) {
          const ids: number[] = JSON.parse(saved);
          setCompletedItems(new Set(ids));
        }
      } catch {
        // 무시
      }
    })();
  }, []);

  // ─── 아티클 로드 ──────────────────────────────────
  const loadArticles = useCallback(async () => {
    setLoadingArticles(true);
    try {
      const params: Record<string, string> = { lang: language };
      if (selectedCategory) params.category = selectedCategory;

      const { data } = await client.get('/guide/articles', { params });
      if (data.success) {
        setArticles(data.data || []);
      }
    } catch {
      // 에러 무시
    } finally {
      setLoadingArticles(false);
    }
  }, [language, selectedCategory]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // ─── 회복 숙소 로드 ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // 강남역 기준 좌표
        const { data } = await client.get('/guide/recovery-houses', {
          params: { lat: 37.4979, lng: 127.0276, lang: language },
        });
        if (data.success) {
          setHouses(data.data || []);
        }
      } catch {
        // 에러 무시
      } finally {
        setLoadingHouses(false);
      }
    })();
  }, [language]);

  // ─── 체크리스트 로드 ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/guide/checklist', {
          params: { lang: language },
        });
        if (data.success) {
          setChecklist(data.data);
        }
      } catch {
        // 에러 무시
      } finally {
        setLoadingChecklist(false);
      }
    })();
  }, [language]);

  // ─── 체크리스트 토글 ──────────────────────────────
  const toggleChecklistItem = async (id: number) => {
    const updated = new Set(completedItems);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setCompletedItems(updated);

    // AsyncStorage에 저장
    try {
      await AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify([...updated]));
    } catch {
      // 무시
    }
  };

  // ─── 체크리스트 진행률 계산 ───────────────────────
  const getChecklistProgress = (): { completed: number; total: number; percent: number } => {
    if (!checklist) return { completed: 0, total: 0, percent: 0 };
    const total = checklist.before.items.length + checklist.dayOf.items.length + checklist.after.items.length;
    const completed = completedItems.size;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const progress = getChecklistProgress();

  // ─── 평점 별 렌더링 ──────────────────────────────
  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += i < full ? '\u2605' : '\u2606';
    }
    return stars;
  };

  /* ================================================================
   *  렌더링
   * ================================================================ */

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ─── 1. 상단 배너 ─────────────────────────────── */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroEmoji}>{'\u{1F30F}'}</Text>
          <Text style={styles.heroTitle}>{t('guide.heroTitle')}</Text>
          <Text style={styles.heroSubtitle}>{t('guide.heroSubtitle')}</Text>

          {/* D-Day 체크리스트 알림 배너 */}
          {checklist && progress.total > 0 && (
            <TouchableOpacity
              style={styles.dDayBanner}
              activeOpacity={0.8}
              onPress={() => {
                // 체크리스트 섹션으로 스크롤 (간단 구현: 카테고리 선택)
              }}
            >
              <View style={styles.dDayLeft}>
                <Text style={styles.dDayIcon}>{'\u{1F4CB}'}</Text>
                <View>
                  <Text style={styles.dDayTitle}>{t('guide.checklistBanner')}</Text>
                  <Text style={styles.dDaySubtitle}>
                    {t('guide.checklistProgress', {
                      completed: progress.completed,
                      total: progress.total,
                    })}
                  </Text>
                </View>
              </View>
              <View style={styles.dDayBadge}>
                <Text style={styles.dDayBadgeText}>{progress.percent}%</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── 2. 카테고리 가로 스크롤 ──────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBar}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key || 'all'}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── 3. 추천 아티클 카드 ──────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('guide.articles')}</Text>

          {loadingArticles ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#E8772E" />
            </View>
          ) : articles.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('common.noData')}</Text>
            </View>
          ) : (
            articles.map((article) => (
              <TouchableOpacity
                key={article.article_id}
                style={styles.articleCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('GuideDetail', { articleId: article.article_id })}
              >
                {/* 썸네일 */}
                <View style={styles.articleThumb}>
                  <Text style={styles.articleThumbIcon}>
                    {CATEGORY_ICONS[article.category] || '\u{1F4D6}'}
                  </Text>
                </View>

                {/* 내용 */}
                <View style={styles.articleBody}>
                  <View style={styles.articleCategoryBadge}>
                    <Text style={styles.articleCategoryText}>{article.category}</Text>
                  </View>
                  <Text style={styles.articleTitle} numberOfLines={2}>
                    {article.title}
                  </Text>
                  <View style={styles.articleMeta}>
                    <Text style={styles.articleReadTime}>
                      {'\u{1F552}'} {estimateReadTime(article.view_count)} {t('guide.read')}
                    </Text>
                    <Text style={styles.articleViews}>
                      {'\u{1F441}\uFE0F'} {article.view_count.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ─── 4. 회복 숙소 섹션 ────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('guide.recoveryHouses')}</Text>
          </View>

          {loadingHouses ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#E8772E" />
            </View>
          ) : (
            <>
              {/* 숙소 카드 (최대 3개) */}
              {houses.slice(0, 3).map((house) => (
                <View key={house.house_id} style={styles.houseCard}>
                  {/* 숙소 아이콘 */}
                  <View style={styles.houseThumb}>
                    <Text style={styles.houseThumbIcon}>{'\u{1F3E8}'}</Text>
                  </View>

                  <View style={styles.houseBody}>
                    <Text style={styles.houseName}>{house.name}</Text>

                    {/* 편의시설 배지 */}
                    <View style={styles.amenityRow}>
                      {house.amenities.slice(0, 3).map((amenity: string) => (
                        <View key={amenity} style={styles.amenityBadge}>
                          <Text style={styles.amenityText}>{amenity}</Text>
                        </View>
                      ))}
                    </View>

                    {/* 평점 + 가격 */}
                    <View style={styles.houseMetaRow}>
                      <Text style={styles.houseStars}>{renderStars(house.rating)}</Text>
                      <Text style={styles.houseRating}>
                        {house.rating.toFixed(1)} ({house.review_count})
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Text style={styles.housePrice}>
                        {convert(house.price_per_night)}
                      </Text>
                      <Text style={styles.housePriceUnit}>/{t('guide.perNight')}</Text>
                    </View>

                    {/* 거리 (있는 경우) */}
                    {house.distance_km != null && (
                      <Text style={styles.houseDistance}>
                        {'\u{1F4CD}'} {house.distance_km < 1
                          ? `${Math.round(house.distance_km * 1000)}m`
                          : `${house.distance_km.toFixed(1)}km`}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* ─── 5. 체크리스트 섹션 ────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('guide.checklist')}</Text>

          {/* 프로그레스 바 */}
          {checklist && progress.total > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress.percent}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {progress.completed}/{progress.total} {t('guide.completed')} ({progress.percent}%)
              </Text>
            </View>
          )}

          {loadingChecklist ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#E8772E" />
            </View>
          ) : checklist ? (
            <>
              {/* 시술 전 체크리스트 */}
              <View style={styles.checklistGroup}>
                <View style={styles.checklistGroupHeader}>
                  <Text style={styles.checklistGroupIcon}>{'\u{1F4CB}'}</Text>
                  <Text style={styles.checklistGroupTitle}>{checklist.before.title}</Text>
                </View>
                {checklist.before.items.map((item) => {
                  const isDone = completedItems.has(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.checklistItem}
                      onPress={() => toggleChecklistItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                        {isDone && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                      </View>
                      <Text style={[styles.checklistText, isDone && styles.checklistTextDone]}>
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 당일 체크리스트 */}
              <View style={styles.checklistGroup}>
                <View style={styles.checklistGroupHeader}>
                  <Text style={styles.checklistGroupIcon}>{'\u{1F4C5}'}</Text>
                  <Text style={styles.checklistGroupTitle}>{checklist.dayOf.title}</Text>
                </View>
                {checklist.dayOf.items.map((item) => {
                  const isDone = completedItems.has(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.checklistItem}
                      onPress={() => toggleChecklistItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                        {isDone && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                      </View>
                      <Text style={[styles.checklistText, isDone && styles.checklistTextDone]}>
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 시술 후 체크리스트 */}
              <View style={styles.checklistGroup}>
                <View style={styles.checklistGroupHeader}>
                  <Text style={styles.checklistGroupIcon}>{'\u2705'}</Text>
                  <Text style={styles.checklistGroupTitle}>{checklist.after.title}</Text>
                </View>
                {checklist.after.items.map((item) => {
                  const isDone = completedItems.has(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.checklistItem}
                      onPress={() => toggleChecklistItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                        {isDone && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                      </View>
                      <Text style={[styles.checklistText, isDone && styles.checklistTextDone]}>
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================================================================
 *  스타일
 * ================================================================ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // ─── 상단 배너 ──────────────────────────────────
  heroBanner: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  heroEmoji: { fontSize: 36, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  heroSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, lineHeight: 20 },

  // D-Day 배너
  dDayBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, padding: 14,
    backgroundColor: '#FFF7ED', borderRadius: 14,
    borderWidth: 1, borderColor: '#FDBA74',
  },
  dDayLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dDayIcon: { fontSize: 24, marginRight: 10 },
  dDayTitle: { fontSize: 14, fontWeight: '700', color: '#C2410C' },
  dDaySubtitle: { fontSize: 12, color: '#9A3412', marginTop: 2 },
  dDayBadge: {
    backgroundColor: '#E8772E', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  dDayBadgeText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  // ─── 카테고리 ───────────────────────────────────
  categoryBar: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  categoryChipActive: { backgroundColor: '#E8772E', borderColor: '#E8772E' },
  categoryIcon: { fontSize: 16, marginRight: 6 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  categoryLabelActive: { color: '#FFFFFF' },

  // ─── 섹션 공통 ─────────────────────────────────
  section: { paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },

  loadingRow: { alignItems: 'center', paddingVertical: 24 },
  emptyBox: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },

  // ─── 아티클 카드 ────────────────────────────────
  articleCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  articleThumb: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  articleThumbIcon: { fontSize: 28 },
  articleBody: { flex: 1 },
  articleCategoryBadge: {
    alignSelf: 'flex-start', backgroundColor: '#EFF6FF',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4,
  },
  articleCategoryText: { fontSize: 10, fontWeight: '700', color: '#2563EB' },
  articleTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', lineHeight: 21 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 },
  articleReadTime: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  articleViews: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  // ─── 회복 숙소 카드 ─────────────────────────────
  houseCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  houseThumb: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  houseThumbIcon: { fontSize: 26 },
  houseBody: { flex: 1 },
  houseName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  amenityRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  amenityBadge: {
    backgroundColor: '#F0FDF4', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  amenityText: { fontSize: 10, fontWeight: '600', color: '#16A34A' },
  houseMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  houseStars: { fontSize: 12, color: '#F59E0B', marginRight: 4 },
  houseRating: { fontSize: 11, color: '#9CA3AF' },
  housePrice: { fontSize: 16, fontWeight: '800', color: '#E8772E' },
  housePriceUnit: { fontSize: 11, color: '#9CA3AF', marginLeft: 2 },
  houseDistance: { fontSize: 11, color: '#6B7280', marginTop: 4 },

  // ─── 체크리스트 ─────────────────────────────────
  progressSection: { marginBottom: 16 },
  progressBarBg: {
    height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', backgroundColor: '#E8772E', borderRadius: 4,
  },
  progressText: {
    fontSize: 12, fontWeight: '600', color: '#6B7280', marginTop: 6, textAlign: 'right',
  },

  checklistGroup: { marginBottom: 20 },
  checklistGroupHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  checklistGroupIcon: { fontSize: 18, marginRight: 8 },
  checklistGroupTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },

  checklistItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: '#FFFFFF', borderRadius: 10, marginBottom: 6,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkboxDone: {
    backgroundColor: '#E8772E', borderColor: '#E8772E',
  },
  checkmark: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  checklistText: { flex: 1, fontSize: 14, color: '#4B5563', lineHeight: 20 },
  checklistTextDone: { color: '#9CA3AF', textDecorationLine: 'line-through' },
});
