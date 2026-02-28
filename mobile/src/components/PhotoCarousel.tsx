/**
 * 사진 캐러셀 컴포넌트
 * 가로 스크롤 페이징 + 하단 점 인디케이터
 */
import React, { useState, useCallback } from 'react';
import {
  View, Image, FlatList, StyleSheet, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PhotoCarouselProps {
  photos: string[];
  height?: number;
}

function PhotoCarousel({ photos, height = 300 }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 스크롤 위치로 현재 페이지 계산
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    setCurrentIndex(index);
  }, []);

  // 각 사진 렌더링
  const renderPhoto = useCallback(({ item }: { item: string }) => (
    <Image
      source={{ uri: item }}
      style={{ width: SCREEN_WIDTH, height }}
      resizeMode="cover"
    />
  ), [height]);

  // 키 추출
  const keyExtractor = useCallback((_: string, index: number) => String(index), []);

  return (
    <View style={{ height }}>
      <FlatList
        data={photos}
        keyExtractor={keyExtractor}
        renderItem={renderPhoto}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* 점 인디케이터 */}
      {photos.length > 1 && (
        <View style={styles.dotsContainer}>
          {photos.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                currentIndex === idx && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 20,
  },
});

export default React.memo(PhotoCarousel);
