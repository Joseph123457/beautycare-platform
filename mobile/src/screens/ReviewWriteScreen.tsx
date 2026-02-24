/**
 * 리뷰 작성 화면
 * 푸시 알림 딥링크(REVIEW_REQUEST)에서 이동하는 대상 화면
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import client from '../api/client';
import { RootStackParamList } from '../types';

type Props = StackScreenProps<RootStackParamList, 'ReviewWrite'>;

export default function ReviewWriteScreen({ route, navigation }: Props) {
  const { hospitalId, hospitalName } = route.params;
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 별점 선택
  const renderStars = () => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => setRating(star)}>
          <Text style={[styles.star, star <= rating && styles.starActive]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // 리뷰 제출
  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('알림', '리뷰 내용을 입력해주세요');
      return;
    }
    if (content.trim().length < 10) {
      Alert.alert('알림', '리뷰는 최소 10자 이상 작성해주세요');
      return;
    }

    setSubmitting(true);
    try {
      await client.post(`/reviews/${hospitalId}`, {
        rating,
        content: content.trim(),
      });
      Alert.alert('감사합니다', '리뷰가 등록되었습니다', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.message || '리뷰 등록에 실패했습니다';
      Alert.alert('오류', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 병원 이름 */}
        {hospitalName && (
          <Text style={styles.hospitalName}>{hospitalName}</Text>
        )}

        {/* 별점 선택 */}
        <Text style={styles.label}>만족도를 선택해주세요</Text>
        {renderStars()}
        <Text style={styles.ratingText}>{rating}점</Text>

        {/* 리뷰 내용 */}
        <Text style={styles.label}>리뷰를 작성해주세요</Text>
        <TextInput
          style={styles.textInput}
          multiline
          placeholder="시술 경험을 자세히 알려주세요 (최소 10자)"
          placeholderTextColor="#9CA3AF"
          value={content}
          onChangeText={setContent}
          maxLength={1000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{content.length}/1000</Text>

        {/* 제출 버튼 */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? '등록 중...' : '리뷰 등록'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 20 },
  hospitalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  star: { fontSize: 36, color: '#D1D5DB' },
  starActive: { color: '#F59E0B' },
  ratingText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 160,
    lineHeight: 22,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#1E5FA8',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
