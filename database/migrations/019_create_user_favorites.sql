-- 019: 사용자 즐겨찾기(좋아요) 테이블 생성
-- 사용자가 피드 콘텐츠를 즐겨찾기에 추가하는 기능

CREATE TABLE user_favorites (
  favorite_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  content_id BIGINT NOT NULL REFERENCES feed_contents(content_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

-- 인덱스
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_content_id ON user_favorites(content_id);
