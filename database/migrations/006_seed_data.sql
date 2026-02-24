-- ============================================================
-- 006_seed_data.sql — 테스트용 더미 데이터
-- ============================================================
-- 실행 방법:
--   psql -U postgres -d beautycare -f database/migrations/006_seed_data.sql
-- 사전 조건: 001~005 모든 마이그레이션 실행 완료
-- 주의: 개발/테스트 환경에서만 실행할 것
-- ============================================================

-- --------------------------------------------------------
-- 1. 테스트 사용자 (환자 5명 + 병원 관리자 10명)
-- --------------------------------------------------------
-- 비밀번호는 모두 'test1234' (bcrypt 해싱 결과)
-- $2a$12$ 로 시작하는 bcrypt 해시

-- 환자 계정 5개
INSERT INTO users (email, phone, password_hash, name, gender, birth_date, preferred_regions) VALUES
('patient1@test.com', '010-1111-0001', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '김환자', 'female', '1995-03-15', '["강남구", "서초구"]'),
('patient2@test.com', '010-1111-0002', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '이진료', 'male', '1990-07-22', '["마포구"]'),
('patient3@test.com', '010-1111-0003', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '박미용', 'female', '1998-11-30', '["강남구", "종로구", "마포구"]'),
('patient4@test.com', '010-1111-0004', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '최성형', 'male', '1988-01-10', '["서초구"]'),
('patient5@test.com', '010-1111-0005', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '정피부', 'female', '2000-05-05', '["강남구", "마포구"]');

-- 병원 관리자 계정 10개 (각 병원 1명)
INSERT INTO users (email, phone, password_hash, name, gender) VALUES
('hospital1@test.com',  '010-2222-0001', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '강남1원장', 'male'),
('hospital2@test.com',  '010-2222-0002', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '강남2원장', 'female'),
('hospital3@test.com',  '010-2222-0003', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '서초1원장', 'male'),
('hospital4@test.com',  '010-2222-0004', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '서초2원장', 'female'),
('hospital5@test.com',  '010-2222-0005', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '마포1원장', 'male'),
('hospital6@test.com',  '010-2222-0006', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '마포2원장', 'female'),
('hospital7@test.com',  '010-2222-0007', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '종로1원장', 'male'),
('hospital8@test.com',  '010-2222-0008', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '종로2원장', 'female'),
('hospital9@test.com',  '010-2222-0009', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '홍대1원장', 'male'),
('hospital10@test.com', '010-2222-0010', '$2a$12$T4jaAVn/vZFGZ/OQn9HDnuZIysOTBPJM/Y4/NlmmHh14y4lDpLZHS', '홍대2원장', 'female');

-- --------------------------------------------------------
-- 2. 병원 10개 (서울 주요 5개 구, 각 2개)
-- --------------------------------------------------------

-- 강남구 병원 2개
INSERT INTO hospitals (owner_user_id, name, category, address, lat, lng, description, operating_hours, avg_rating, review_count, is_verified, subscription_tier) VALUES
(6, '강남뷰티성형외과', '성형외과', '서울특별시 강남구 테헤란로 123', 37.5012743, 127.0396857, '강남역 5번 출구 도보 3분. 코·눈 성형 전문.', '{"mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00","fri":"09:00-19:00","sat":"09:00-14:00","sun":"휴진"}', 4.50, 3, true, 'PRO'),
(7, '강남클리어피부과', '피부과', '서울특별시 강남구 역삼로 456', 37.4979461, 127.0276241, '레이저·보톡스·필러 전문 피부과.', '{"mon":"10:00-20:00","tue":"10:00-20:00","wed":"10:00-20:00","thu":"10:00-20:00","fri":"10:00-20:00","sat":"10:00-15:00","sun":"휴진"}', 4.33, 3, true, 'BASIC');

-- 서초구 병원 2개
INSERT INTO hospitals (owner_user_id, name, category, address, lat, lng, description, operating_hours, avg_rating, review_count, is_verified, subscription_tier) VALUES
(8, '서초밝은치과', '치과', '서울특별시 서초구 서초대로 789', 37.4923615, 127.0292881, '임플란트·교정·미백 전문.', '{"mon":"09:30-18:30","tue":"09:30-18:30","wed":"09:30-18:30","thu":"09:30-21:00","fri":"09:30-18:30","sat":"09:00-14:00","sun":"휴진"}', 4.67, 3, true, 'BASIC'),
(9, '서초에스성형외과', '성형외과', '서울특별시 서초구 반포대로 321', 37.5044878, 127.0049518, '눈·코·리프팅 전문 성형외과.', '{"mon":"09:00-18:00","tue":"09:00-18:00","wed":"09:00-18:00","thu":"09:00-18:00","fri":"09:00-18:00","sat":"09:00-13:00","sun":"휴진"}', 4.00, 3, false, 'FREE');

-- 마포구 병원 2개
INSERT INTO hospitals (owner_user_id, name, category, address, lat, lng, description, operating_hours, avg_rating, review_count, is_verified, subscription_tier) VALUES
(10, '마포밝은안과', '안과', '서울특별시 마포구 마포대로 654', 37.5536067, 126.9519216, '라식·라섹·백내장 전문.', '{"mon":"09:00-18:00","tue":"09:00-18:00","wed":"09:00-18:00","thu":"09:00-18:00","fri":"09:00-18:00","sat":"09:00-13:00","sun":"휴진"}', 4.33, 3, true, 'PRO'),
(11, '마포리안피부과', '피부과', '서울특별시 마포구 양화로 987', 37.5547125, 126.9368163, '여드름·흉터·레이저 토닝 전문.', '{"mon":"10:00-19:00","tue":"10:00-19:00","wed":"10:00-19:00","thu":"10:00-21:00","fri":"10:00-19:00","sat":"10:00-15:00","sun":"휴진"}', 3.67, 3, false, 'FREE');

-- 종로구 병원 2개
INSERT INTO hospitals (owner_user_id, name, category, address, lat, lng, description, operating_hours, avg_rating, review_count, is_verified, subscription_tier) VALUES
(12, '종로예쁜치과', '치과', '서울특별시 종로구 종로 111', 37.5704164, 126.9922426, '세라믹·라미네이트·잇몸 치료 전문.', '{"mon":"09:00-18:00","tue":"09:00-18:00","wed":"09:00-18:00","thu":"09:00-18:00","fri":"09:00-18:00","sat":"09:00-13:00","sun":"휴진"}', 4.33, 3, true, 'BASIC'),
(13, '종로아이안과', '안과', '서울특별시 종로구 삼봉로 222', 37.5717194, 126.9833416, '드림렌즈·스마일라식 전문.', '{"mon":"09:00-18:00","tue":"09:00-18:00","wed":"09:00-18:00","thu":"09:00-18:00","fri":"09:00-18:00","sat":"09:00-13:00","sun":"휴진"}', 4.00, 3, false, 'FREE');

-- 홍대(마포구 연남/서교) 병원 2개
INSERT INTO hospitals (owner_user_id, name, category, address, lat, lng, description, operating_hours, avg_rating, review_count, is_verified, subscription_tier) VALUES
(14, '홍대제이성형외과', '성형외과', '서울특별시 마포구 어울마당로 333', 37.5563466, 126.9230747, '쌍꺼풀·코끝·지방흡입 전문.', '{"mon":"10:00-19:00","tue":"10:00-19:00","wed":"10:00-19:00","thu":"10:00-19:00","fri":"10:00-19:00","sat":"10:00-15:00","sun":"휴진"}', 4.67, 3, true, 'PRO'),
(15, '홍대글로우피부과', '피부과', '서울특별시 마포구 와우산로 444', 37.5548065, 126.9254153, '피코레이저·울쎄라·스킨보톡스 전문.', '{"mon":"11:00-21:00","tue":"11:00-21:00","wed":"11:00-21:00","thu":"11:00-21:00","fri":"11:00-21:00","sat":"11:00-17:00","sun":"휴진"}', 3.33, 3, false, 'FREE');

-- --------------------------------------------------------
-- 3. 예약 데이터 (일부 리뷰 연결용)
-- --------------------------------------------------------
INSERT INTO reservations (hospital_id, user_id, treatment_name, reserved_at, status) VALUES
-- 환자1 (user_id=1)
(1, 1, '코 성형 상담', '2026-01-10 14:00:00+09', 'DONE'),
(2, 1, '보톡스 시술', '2026-01-15 11:00:00+09', 'DONE'),
(3, 1, '치아 미백', '2026-02-01 10:00:00+09', 'DONE'),
-- 환자2 (user_id=2)
(4, 2, '눈 성형 상담', '2026-01-20 15:00:00+09', 'DONE'),
(5, 2, '라식 상담', '2026-01-25 09:00:00+09', 'DONE'),
(6, 2, '여드름 치료', '2026-02-05 13:00:00+09', 'DONE'),
-- 환자3 (user_id=3)
(7, 3, '라미네이트 상담', '2026-01-12 10:00:00+09', 'DONE'),
(8, 3, '드림렌즈 상담', '2026-01-18 16:00:00+09', 'DONE'),
(9, 3, '쌍꺼풀 상담', '2026-02-10 11:00:00+09', 'DONE'),
-- 환자4 (user_id=4)
(10, 4, '피코레이저', '2026-02-12 14:00:00+09', 'DONE'),
(1, 4, '코끝 성형', '2026-02-15 10:00:00+09', 'DONE'),
(2, 4, '필러 시술', '2026-02-18 15:00:00+09', 'DONE'),
-- 환자5 (user_id=5)
(3, 5, '임플란트 상담', '2026-02-01 09:00:00+09', 'DONE'),
(4, 5, '리프팅 상담', '2026-02-08 14:00:00+09', 'DONE'),
(5, 5, '라섹 상담', '2026-02-14 10:00:00+09', 'DONE');

-- --------------------------------------------------------
-- 4. 리뷰 30개 (각 병원 3개, 모두 승인됨)
-- --------------------------------------------------------

-- 병원 1: 강남뷰티성형외과
INSERT INTO reviews (hospital_id, user_id, reservation_id, rating, content, is_approved) VALUES
(1, 1, 1, 5, '코 성형 상담 받았는데 원장님이 정말 꼼꼼하게 설명해주셨어요. 카운슬러분도 친절하고 강압적이지 않아서 좋았습니다.', true),
(1, 4, 11, 4, '코끝 수술 후 경과가 좋아요. 자연스러운 결과에 만족합니다. 다만 대기시간이 좀 길었어요.', true),
(1, 3, NULL, 4, '분위기가 깔끔하고 의료진이 전문적입니다. 상담만 받았는데도 꼼꼼했어요.', true);

-- 병원 2: 강남클리어피부과
INSERT INTO reviews (hospital_id, user_id, reservation_id, rating, content, is_approved) VALUES
(2, 1, 2, 5, '보톡스 시술 받았는데 거의 안 아팠어요. 효과도 자연스럽고 가격도 합리적!', true),
(2, 4, 12, 4, '필러 맞았는데 결과가 자연스럽습니다. 시술 후 관리 안내도 잘 해주셨어요.', true),
(2, 5, NULL, 4, '피부 톤이 확 밝아졌어요. 레이저 토닝 3회차인데 만족스럽습니다.', true);

-- 병원 3: 서초밝은치과
INSERT INTO reviews (hospital_id, user_id, reservation_id, rating, content, is_approved) VALUES
(3, 1, 3, 5, '치아 미백 결과가 놀랍습니다! 3톤 정도 밝아졌어요. 시술 과정도 편안했습니다.', true),
(3, 5, 13, 4, '임플란트 상담이 매우 상세했습니다. CT 찍고 3D로 시뮬레이션까지 보여주셨어요.', true),
(3, 2, NULL, 5, '교정 상담 받았는데 투명교정 추천해주셨어요. 비용 설명도 투명하고 좋았습니다.', true);

-- 병원 4: 서초에스성형외과
INSERT INTO reviews (hospital_id, user_id, reservation_id, rating, content, is_approved) VALUES
(4, 2, 4, 4, '눈 성형 상담 갔는데 무리하게 수술 권유하지 않아서 좋았어요. 솔직한 상담이었습니다.', true),
(4, 5, 14, 4, '리프팅 상담 받았습니다. 여러 옵션을 비교해서 설명해주셔서 이해하기 쉬웠어요.', true),
(4, 3, NULL, 4, '원장님 경력이 오래되셔서 신뢰가 갑니다. 시설도 깨끗합니다.', true);

-- 병원 5: 마포밝은안과
INSERT INTO reviews (hospital_id, user_id, reservation_id, rating, content, is_approved) VALUES
(5, 2, 5, 5, '라식 상담 갔다가 라섹이 더 적합하다고 솔직하게 말씀해주셨어요. 수익보다 환자를 생각하는 느낌!', true),
(5, 5, 15, 4, '라섹 상담 꼼꼼하게 받았습니다. 검사 장비도 최신이고 대기 공간도 쾌적해요.', true),
(5, 3, NULL, 4, '백내장 수술 후 경과가 매우 좋습니다. 후속 관리도 체계적이에요.', true);

-- 병원 6: 마포리안피부과
INSERT INTO reviews (hospital_id, user_id, reservation_id, rating, content, is_approved) VALUES
(6, 2, 6, 4, '여드름 치료 3개월째인데 확실히 좋아지고 있어요. 꾸준히 다니려고 합니다.', true),
(6, 4, NULL, 3, '효과는 있는데 예약 잡기가 좀 어렵습니다. 인기가 많은 것 같아요.', true),
(6, 1, NULL, 4, '흉터 치료 받았는데 눈에 띄게 나아졌어요. 가성비 좋은 피부과입니다.', true);

-- 병원 7: 종로예쁜치과
INSERT INTO reviews (hospital_id, user_id, reservation_id, rating, content, is_approved) VALUES
(7, 3, 7, 5, '라미네이트 상담부터 시술까지 정말 꼼꼼했어요. 결과물도 자연스럽고 만족합니다.', true),
(7, 1, NULL, 4, '스케일링 받았는데 통증 없이 깔끔하게 해주셨어요. 직원분들도 친절합니다.', true),
(7, 5, NULL, 4, '잇몸 치료로 다니고 있는데 증상이 많이 개선되었어요. 꾸준히 다닐 예정입니다.', true);

-- 병원 8: 종로아이안과
INSERT INTO reviews (hospital_id, user_id, reservation_id, rating, content, is_approved) VALUES
(8, 3, 8, 4, '드림렌즈 상담 받았습니다. 아이 시력 관리에 대해 자세히 설명해주셔서 감사합니다.', true),
(8, 2, NULL, 4, '시력검사가 매우 정밀했어요. 다른 안과에서 놓쳤던 부분도 찾아주셨습니다.', true),
(8, 4, NULL, 4, '스마일라식 상담 갔는데 검사 결과에 따라 솔직하게 말씀해주셔서 좋았어요.', true);

-- 병원 9: 홍대제이성형외과
INSERT INTO reviews (hospital_id, user_id, reservation_id, rating, content, is_approved) VALUES
(9, 3, 9, 5, '쌍꺼풀 수술 후 2주차인데 자연스럽게 잡혔어요. 원장님 센스가 좋습니다!', true),
(9, 1, NULL, 5, '지방흡입 상담 받았는데 현실적인 기대치를 설명해주셔서 신뢰가 갔어요.', true),
(9, 5, NULL, 4, '코끝 성형 결과가 좋아요. 전체적으로 만족하는데 붓기가 좀 오래 갔어요.', true);

-- 병원 10: 홍대글로우피부과
INSERT INTO reviews (hospital_id, user_id, reservation_id, rating, content, is_approved) VALUES
(10, 4, 10, 4, '피코레이저 효과 확실합니다! 기미가 눈에 띄게 옅어졌어요. 추천합니다.', true),
(10, 2, NULL, 3, '시술은 좋은데 주차가 불편해요. 대중교통으로 오시는 걸 추천합니다.', true),
(10, 1, NULL, 3, '스킨보톡스 받았는데 효과가 기대보다 약했어요. 개인차가 있는 것 같습니다.', true);

-- --------------------------------------------------------
-- 5. 구독 데이터 (PRO/BASIC 병원만)
-- --------------------------------------------------------
INSERT INTO subscriptions (hospital_id, tier, price, started_at, expires_at, auto_renew, payment_method) VALUES
(1, 'PRO',   990000, '2026-01-01 00:00:00+09', '2026-04-01 00:00:00+09', true, 'toss_card'),
(2, 'BASIC', 490000, '2026-01-15 00:00:00+09', '2026-04-15 00:00:00+09', true, 'toss_card'),
(3, 'BASIC', 490000, '2026-02-01 00:00:00+09', '2026-05-01 00:00:00+09', true, 'toss_transfer'),
(5, 'PRO',   990000, '2026-01-10 00:00:00+09', '2026-04-10 00:00:00+09', true, 'toss_card'),
(7, 'BASIC', 490000, '2026-02-01 00:00:00+09', '2026-05-01 00:00:00+09', false, 'toss_card'),
(9, 'PRO',   990000, '2026-01-20 00:00:00+09', '2026-04-20 00:00:00+09', true, 'toss_transfer');
