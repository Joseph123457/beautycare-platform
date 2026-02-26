/**
 * 가이드 아티클 상세 화면
 *
 * /api/guide/articles/:id 에서 아티클을 불러와 제목·본문·메타 정보를 렌더링한다.
 * Markdown 형태의 본문(##, ###, -, **)을 간이 파싱하여 표시한다.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Platform, TouchableOpacity, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { RootStackParamList } from '../types';

type GuideDetailRoute = RouteProp<RootStackParamList, 'GuideDetail'>;

// 카테고리별 아이콘
const CATEGORY_ICONS: Record<string, string> = {
  VISA: '\u2708\uFE0F',
  RECOVERY: '\u{1F3E5}',
  TRANSPORT: '\u{1F687}',
  ACCOMMODATION: '\u{1F3E8}',
  INSURANCE: '\u{1F48A}',
  PROCEDURE: '\u{1F489}',
};

// 카테고리 라벨 (i18n 키 매핑)
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  VISA: 'guide.catVisa',
  RECOVERY: 'guide.catRecovery',
  TRANSPORT: 'guide.catTransport',
  ACCOMMODATION: 'guide.catAccommodation',
  INSURANCE: 'guide.catInsurance',
  PROCEDURE: 'guide.catProcedure',
};

interface ArticleDetail {
  article_id: number;
  category: string;
  title: string;
  content: string;
  thumbnail_url: string | null;
  tags: string[];
  view_count: number;
  published_at: string;
  updated_at: string;
}

/**
 * 간이 마크다운 파서
 * ## / ### 헤딩, - 리스트, **굵게**, | 테이블을 간단히 처리
 */
function renderMarkdownContent(content: string) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      // 빈 줄 → 간격
      elements.push(<View key={index} style={mdStyles.spacer} />);
      return;
    }

    // ## 헤딩
    if (trimmed.startsWith('## ')) {
      elements.push(
        <Text key={index} style={mdStyles.h2}>
          {trimmed.replace(/^##\s+/, '')}
        </Text>
      );
      return;
    }

    // ### 소제목
    if (trimmed.startsWith('### ')) {
      elements.push(
        <Text key={index} style={mdStyles.h3}>
          {trimmed.replace(/^###\s+/, '')}
        </Text>
      );
      return;
    }

    // - 리스트 아이템
    if (trimmed.startsWith('- ')) {
      const text = trimmed.replace(/^-\s+/, '');
      elements.push(
        <View key={index} style={mdStyles.listItem}>
          <Text style={mdStyles.bullet}>{'\u2022'}</Text>
          <Text style={mdStyles.listText}>{renderBoldText(text)}</Text>
        </View>
      );
      return;
    }

    // | 테이블 행
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // 구분선 행 무시 (|---|---|)
      if (trimmed.includes('---')) return;

      const cells = trimmed
        .split('|')
        .filter(Boolean)
        .map((c) => c.trim());

      elements.push(
        <View key={index} style={mdStyles.tableRow}>
          {cells.map((cell, ci) => (
            <Text key={ci} style={mdStyles.tableCell}>
              {renderBoldText(cell)}
            </Text>
          ))}
        </View>
      );
      return;
    }

    // 숫자 리스트 (1. 2. 3.)
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.+)/);
      if (match) {
        elements.push(
          <View key={index} style={mdStyles.listItem}>
            <Text style={mdStyles.numBullet}>{match[1]}.</Text>
            <Text style={mdStyles.listText}>{renderBoldText(match[2])}</Text>
          </View>
        );
        return;
      }
    }

    // 일반 텍스트
    elements.push(
      <Text key={index} style={mdStyles.paragraph}>
        {renderBoldText(trimmed)}
      </Text>
    );
  });

  return elements;
}

/**
 * **굵게** 텍스트 처리
 */
function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    // 홀수 인덱스가 볼드 텍스트
    if (i % 2 === 1) {
      return (
        <Text key={i} style={mdStyles.bold}>
          {part}
        </Text>
      );
    }
    return part;
  });
}

export default function GuideDetailScreen() {
  const route = useRoute<GuideDetailRoute>();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { articleId } = route.params;

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ─── 아티클 로드 ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get(`/guide/articles/${articleId}`, {
          params: { lang: language },
        });
        if (data.success && data.data) {
          setArticle(data.data);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [articleId, language]);

  // ─── 공유 ─────────────────────────────────────────────
  const handleShare = async () => {
    if (!article) return;
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\nBeautyCare Medical Tourism Guide`,
      });
    } catch {
      // 무시
    }
  };

  // ─── 로딩 ─────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E8772E" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 에러 ─────────────────────────────────────────────
  if (error || !article) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>{'\u{1F4D6}'}</Text>
          <Text style={styles.errorText}>{t('common.noData')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryBtnText}>{'\u2190'} {t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 발행일 포맷 ──────────────────────────────────────
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── 상단 카테고리 배너 ────────────────────────── */}
        <View style={styles.categoryBanner}>
          <Text style={styles.categoryIcon}>
            {CATEGORY_ICONS[article.category] || '\u{1F4D6}'}
          </Text>
          <Text style={styles.categoryLabel}>
            {t(CATEGORY_LABEL_KEYS[article.category] || 'guide.catAll')}
          </Text>
        </View>

        {/* ─── 제목 ──────────────────────────────────────── */}
        <Text style={styles.title}>{article.title}</Text>

        {/* ─── 메타 정보 ─────────────────────────────────── */}
        <View style={styles.metaRow}>
          {publishedDate ? (
            <Text style={styles.metaText}>{'\u{1F4C5}'} {publishedDate}</Text>
          ) : null}
          <Text style={styles.metaText}>
            {'\u{1F441}\uFE0F'} {article.view_count.toLocaleString()} {t('guide.read')}
          </Text>
        </View>

        {/* ─── 태그 ──────────────────────────────────────── */}
        {article.tags && article.tags.length > 0 && (
          <View style={styles.tagRow}>
            {article.tags.map((tag) => (
              <View key={tag} style={styles.tagBadge}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ─── 구분선 ────────────────────────────────────── */}
        <View style={styles.divider} />

        {/* ─── 본문 ──────────────────────────────────────── */}
        <View style={styles.contentSection}>
          {renderMarkdownContent(article.content)}
        </View>

        {/* ─── 하단 공유 버튼 ────────────────────────────── */}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Text style={styles.shareBtnIcon}>{'\u{1F4E4}'}</Text>
          <Text style={styles.shareBtnText}>Share this article</Text>
        </TouchableOpacity>

        {/* 하단 여백 */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================================================================
 *  마크다운 스타일
 * ================================================================ */

const mdStyles = StyleSheet.create({
  h2: {
    fontSize: 20, fontWeight: '800', color: '#1F2937',
    marginTop: 20, marginBottom: 8,
  },
  h3: {
    fontSize: 17, fontWeight: '700', color: '#374151',
    marginTop: 16, marginBottom: 6,
  },
  paragraph: {
    fontSize: 15, color: '#4B5563', lineHeight: 24, marginVertical: 3,
  },
  bold: {
    fontWeight: '700', color: '#1F2937',
  },
  listItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginVertical: 3, paddingLeft: 4,
  },
  bullet: {
    fontSize: 15, color: '#E8772E', fontWeight: '700',
    width: 16, marginRight: 6, marginTop: 1,
  },
  numBullet: {
    fontSize: 14, color: '#E8772E', fontWeight: '700',
    width: 20, marginRight: 4, marginTop: 1,
  },
  listText: {
    flex: 1, fontSize: 15, color: '#4B5563', lineHeight: 23,
  },
  tableRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  tableCell: {
    flex: 1, fontSize: 13, color: '#4B5563', paddingHorizontal: 4,
  },
  spacer: { height: 6 },
});

/* ================================================================
 *  페이지 스타일
 * ================================================================ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // 로딩 & 에러
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#9CA3AF' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: { fontSize: 16, color: '#6B7280', marginBottom: 20 },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  retryBtnText: { fontSize: 15, color: '#E8772E', fontWeight: '600' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  // 카테고리 배너
  categoryBanner: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    marginBottom: 14,
  },
  categoryIcon: { fontSize: 16, marginRight: 6 },
  categoryLabel: { fontSize: 13, fontWeight: '700', color: '#2563EB' },

  // 제목
  title: {
    fontSize: 24, fontWeight: '800', color: '#1F2937',
    lineHeight: 34, marginBottom: 12,
  },

  // 메타 정보
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginBottom: 12,
  },
  metaText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  // 태그
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tagBadge: {
    backgroundColor: '#F3F4F6', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  // 구분선
  divider: {
    height: 1, backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },

  // 본문
  contentSection: { paddingBottom: 20 },

  // 공유 버튼
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, backgroundColor: '#F3F4F6', borderRadius: 12,
    marginTop: 8,
  },
  shareBtnIcon: { fontSize: 16, marginRight: 8 },
  shareBtnText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
});
