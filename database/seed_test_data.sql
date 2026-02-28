-- 벌크 테스트 피드 콘텐츠 데이터
-- 병원 1~10에 다양한 카테고리별 콘텐츠 삽입

-- ─── 병원 1: 강남뷰티성형외과 (성형외과) ───
INSERT INTO feed_contents (hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng, view_count, like_count, is_approved, is_active) VALUES
(1, '성형외과', '["https://picsum.photos/seed/beauty1/800/1200","https://picsum.photos/seed/beauty1b/800/1200"]',
 '자연스러운 코 라인 교정 시술 결과입니다. 환자분의 얼굴 비율에 맞춰 최적의 높이와 각도로 교정하였습니다.',
 '코성형 비급여: 350만원~500만원',
 '["코성형","자연코","콧대"]', 37.4979, 127.0276, 156, 23, true, true),

(1, '성형외과', '["https://picsum.photos/seed/beauty2/800/1200","https://picsum.photos/seed/beauty2b/800/1200","https://picsum.photos/seed/beauty2c/800/1200"]',
 '눈매교정과 쌍꺼풀 수술 3개월 후 결과입니다. 부기가 완전히 빠진 후 자연스러운 라인이 완성되었습니다.',
 '쌍꺼풀(매몰) 비급여: 80만원~150만원 / 눈매교정 비급여: 120만원~200만원',
 '["쌍꺼풀","눈매교정","자연쌍꺼풀"]', 37.4979, 127.0276, 289, 45, true, true),

(1, '성형외과', '["https://picsum.photos/seed/beauty3/800/1200"]',
 '안면윤곽 수술 6개월 후 결과입니다. V라인으로 세련된 턱 라인이 완성되었습니다.',
 '안면윤곽(사각턱) 비급여: 400만원~600만원',
 '["안면윤곽","사각턱","V라인"]', 37.4979, 127.0276, 412, 67, true, true);

-- ─── 병원 2: 강남클리어피부과 (피부과) ───
INSERT INTO feed_contents (hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng, view_count, like_count, is_approved, is_active) VALUES
(2, '피부과', '["https://picsum.photos/seed/skin1/800/1200","https://picsum.photos/seed/skin1b/800/1200"]',
 '여드름 흉터 프락셀 레이저 5회 시술 후 결과입니다. 울퉁불퉁한 피부결이 매끈하게 개선되었습니다.',
 '프락셀 레이저 비급여: 1회 30만원 / 5회 패키지 120만원',
 '["여드름흉터","프락셀","레이저"]', 37.5013, 127.0246, 198, 31, true, true),

(2, '피부과', '["https://picsum.photos/seed/skin2/800/1200","https://picsum.photos/seed/skin2b/800/1200"]',
 '기미·잡티 제거 피코레이저 시술 결과입니다. 3회 시술로 깨끗하고 맑은 피부톤을 되찾았습니다.',
 '피코레이저 비급여: 1회 25만원~35만원',
 '["기미","잡티","피코레이저","미백"]', 37.5013, 127.0246, 334, 52, true, true),

(2, '피부과', '["https://picsum.photos/seed/skin3/800/1200"]',
 '리프팅 시술(울쎄라) 결과입니다. 처진 볼살과 턱선이 탄력있게 올라갔습니다.',
 '울쎄라 리프팅 비급여: 전체 150만원~250만원',
 '["리프팅","울쎄라","탄력","동안"]', 37.5013, 127.0246, 267, 41, true, true);

-- ─── 병원 3: 서초밝은치과 (치과) ───
INSERT INTO feed_contents (hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng, view_count, like_count, is_approved, is_active) VALUES
(3, '치과', '["https://picsum.photos/seed/dental1/800/1200","https://picsum.photos/seed/dental1b/800/1200"]',
 '라미네이트 시술 결과입니다. 고르지 않던 앞니가 깔끔한 스마일 라인으로 완성되었습니다.',
 '라미네이트(1개) 비급여: 60만원~100만원',
 '["라미네이트","앞니","스마일라인"]', 37.4837, 127.0324, 176, 28, true, true),

(3, '치과', '["https://picsum.photos/seed/dental2/800/1200"]',
 '치아미백 시술 전후 결과입니다. 누렇게 변색된 치아가 밝고 환한 화이트톤으로 변했습니다.',
 '전문가 치아미백 비급여: 30만원~50만원',
 '["치아미백","화이트닝","미백"]', 37.4837, 127.0324, 223, 35, true, true),

(3, '치과', '["https://picsum.photos/seed/dental3/800/1200","https://picsum.photos/seed/dental3b/800/1200"]',
 '투명교정 치료 1년 후 결과입니다. 덧니와 비뚤어진 치열이 가지런하게 교정되었습니다.',
 '투명교정 비급여: 300만원~500만원 (난이도에 따라 상이)',
 '["투명교정","치열교정","인비절라인"]', 37.4837, 127.0324, 389, 61, true, true);

-- ─── 병원 4: 서초에스성형외과 (성형외과) ───
INSERT INTO feed_contents (hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng, view_count, like_count, is_approved, is_active) VALUES
(4, '성형외과', '["https://picsum.photos/seed/seocho1/800/1200","https://picsum.photos/seed/seocho1b/800/1200"]',
 '지방흡입 시술 결과입니다. 복부와 허벅지의 군살이 제거되어 날씬한 실루엣이 완성되었습니다.',
 '지방흡입(복부) 비급여: 300만원~500만원 / (허벅지) 250만원~400만원',
 '["지방흡입","바디라인","복부","허벅지"]', 37.4845, 127.0287, 445, 72, true, true),

(4, '성형외과', '["https://picsum.photos/seed/seocho2/800/1200"]',
 '가슴 보형물 수술 6개월 후 결과입니다. 자연스러운 형태와 촉감으로 만족도가 높습니다.',
 '가슴성형 비급여: 500만원~800만원 (보형물 종류에 따라 상이)',
 '["가슴성형","보형물","자연가슴"]', 37.4845, 127.0287, 512, 83, true, true),

(4, '성형외과', '["https://picsum.photos/seed/seocho3/800/1200","https://picsum.photos/seed/seocho3b/800/1200","https://picsum.photos/seed/seocho3c/800/1200"]',
 '이마지방이식 시술 결과입니다. 볼륨감 있는 이마로 옆모습이 훨씬 부드러워졌습니다.',
 '이마지방이식 비급여: 150만원~250만원',
 '["이마지방이식","지방이식","볼륨"]', 37.4845, 127.0287, 178, 29, true, true);

-- ─── 병원 5: 마포밝은안과 (안과) ───
INSERT INTO feed_contents (hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng, view_count, like_count, is_approved, is_active) VALUES
(5, '안과', '["https://picsum.photos/seed/eye1/800/1200","https://picsum.photos/seed/eye1b/800/1200"]',
 '라식 수술 후 시력 1.5 달성! 안경 없이도 선명한 세상을 볼 수 있게 되었습니다.',
 '라식 비급여: 양안 130만원~180만원',
 '["라식","시력교정","무안경"]', 37.5565, 126.9225, 567, 92, true, true),

(5, '안과', '["https://picsum.photos/seed/eye2/800/1200"]',
 '스마일라식 수술 결과입니다. 절개 범위가 작아 회복이 빠르고 건조증도 적습니다.',
 '스마일라식 비급여: 양안 200만원~280만원',
 '["스마일라식","시력교정","빠른회복"]', 37.5565, 126.9225, 423, 68, true, true);

-- ─── 병원 6: 마포리안피부과 (피부과) ───
INSERT INTO feed_contents (hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng, view_count, like_count, is_approved, is_active) VALUES
(6, '피부과', '["https://picsum.photos/seed/mapo1/800/1200","https://picsum.photos/seed/mapo1b/800/1200"]',
 '보톡스 시술 결과입니다. 이마 주름과 미간 주름이 자연스럽게 펴졌습니다.',
 '보톡스(이마) 비급여: 10만원~15만원 / (미간) 8만원~12만원',
 '["보톡스","주름","이마","미간"]', 37.5553, 126.9226, 234, 37, true, true),

(6, '피부과', '["https://picsum.photos/seed/mapo2/800/1200","https://picsum.photos/seed/mapo2b/800/1200","https://picsum.photos/seed/mapo2c/800/1200"]',
 '필러 시술 결과입니다. 팔자주름과 볼 볼륨을 보충하여 동안 효과를 얻었습니다.',
 '필러(팔자) 비급여: 30만원~50만원 / (볼) 40만원~60만원',
 '["필러","팔자주름","볼륨","동안"]', 37.5553, 126.9226, 312, 48, true, true),

(6, '피부과', '["https://picsum.photos/seed/mapo3/800/1200"]',
 '모공 축소 레이저 시술 결과입니다. 넓은 모공이 눈에 띄게 줄어들었습니다.',
 '모공레이저 비급여: 1회 15만원~25만원',
 '["모공","레이저","피부결"]', 37.5553, 126.9226, 189, 30, true, true);

-- ─── 병원 7: 종로예쁜치과 (치과) ───
INSERT INTO feed_contents (hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng, view_count, like_count, is_approved, is_active) VALUES
(7, '치과', '["https://picsum.photos/seed/jongro1/800/1200","https://picsum.photos/seed/jongro1b/800/1200"]',
 '임플란트 시술 결과입니다. 빠진 어금니에 튼튼한 임플란트를 심어 저작 기능이 회복되었습니다.',
 '임플란트(1개) 비급여: 120만원~180만원',
 '["임플란트","어금니","보철"]', 37.5720, 126.9794, 298, 46, true, true),

(7, '치과', '["https://picsum.photos/seed/jongro2/800/1200"]',
 '올세라믹 크라운 시술 결과입니다. 변색된 보철물을 자연치아와 구분이 안 될 정도로 교체했습니다.',
 '올세라믹 크라운 비급여: 50만원~80만원',
 '["크라운","세라믹","보철","심미"]', 37.5720, 126.9794, 167, 24, true, true);

-- ─── 병원 8: 종로아이안과 (안과) ───
INSERT INTO feed_contents (hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng, view_count, like_count, is_approved, is_active) VALUES
(8, '안과', '["https://picsum.photos/seed/jongroeye1/800/1200","https://picsum.photos/seed/jongroeye1b/800/1200"]',
 '라섹 수술 후 결과입니다. 각막이 얇아 라식이 어려웠지만 라섹으로 1.2 시력을 달성했습니다.',
 '라섹 비급여: 양안 120만원~160만원',
 '["라섹","시력교정","각막"]', 37.5715, 126.9780, 345, 55, true, true),

(8, '안과', '["https://picsum.photos/seed/jongroeye2/800/1200"]',
 'ICL 렌즈삽입술 결과입니다. 초고도근시(-10D)도 깨끗하게 교정되었습니다.',
 'ICL 렌즈삽입술 비급여: 양안 350만원~500만원',
 '["ICL","렌즈삽입","초고도근시"]', 37.5715, 126.9780, 234, 38, true, true);

-- ─── 병원 9: 홍대제이성형외과 (성형외과) ───
INSERT INTO feed_contents (hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng, view_count, like_count, is_approved, is_active) VALUES
(9, '성형외과', '["https://picsum.photos/seed/hongdae1/800/1200","https://picsum.photos/seed/hongdae1b/800/1200","https://picsum.photos/seed/hongdae1c/800/1200"]',
 '눈밑지방재배치 수술 결과입니다. 다크서클과 눈밑 꺼짐이 동시에 개선되어 밝은 인상이 되었습니다.',
 '눈밑지방재배치 비급여: 150만원~250만원',
 '["눈밑지방","다크서클","눈밑꺼짐","동안"]', 37.5563, 126.9237, 478, 76, true, true),

(9, '성형외과', '["https://picsum.photos/seed/hongdae2/800/1200"]',
 '실리프팅 시술 결과입니다. 처진 볼과 턱선이 실로 당겨져 V라인 효과를 얻었습니다.',
 '실리프팅 비급여: 30만원~80만원 (실 종류/개수에 따라)',
 '["실리프팅","V라인","턱선","리프팅"]', 37.5563, 126.9237, 356, 57, true, true),

(9, '성형외과', '["https://picsum.photos/seed/hongdae3/800/1200","https://picsum.photos/seed/hongdae3b/800/1200"]',
 '턱끝 보형물 수술 결과입니다. 짧은 턱이 길어져 옆모습이 세련되게 변했습니다.',
 '턱끝성형 비급여: 200만원~350만원',
 '["턱끝성형","턱보형물","옆모습","얼굴비율"]', 37.5563, 126.9237, 201, 33, true, true);

-- ─── 병원 10: 홍대글로우피부과 (피부과) ───
INSERT INTO feed_contents (hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng, view_count, like_count, is_approved, is_active) VALUES
(10, '피부과', '["https://picsum.photos/seed/glow1/800/1200","https://picsum.photos/seed/glow1b/800/1200"]',
 '물광주사 시술 결과입니다. 건조하고 칙칙했던 피부가 촉촉하고 광채나는 피부로 변했습니다.',
 '물광주사 비급여: 1회 15만원~25만원 / 3회 패키지 40만원',
 '["물광주사","광채","수분","촉촉"]', 37.5571, 126.9249, 278, 43, true, true),

(10, '피부과', '["https://picsum.photos/seed/glow2/800/1200","https://picsum.photos/seed/glow2b/800/1200","https://picsum.photos/seed/glow2c/800/1200"]',
 '제모 레이저 시술 결과입니다. 5회 시술로 깔끔하게 제모가 완료되었습니다.',
 '제모 레이저 비급여: 겨드랑이 1회 5만원 / 전신 1회 30만원',
 '["제모","레이저제모","겨드랑이"]', 37.5571, 126.9249, 345, 54, true, true),

(10, '피부과', '["https://picsum.photos/seed/glow3/800/1200"]',
 '색소침착 치료 결과입니다. IPL과 토닝 복합 시술로 균일한 피부톤을 되찾았습니다.',
 'IPL 비급여: 1회 10만원~15만원 / 토닝 1회 8만원~12만원',
 '["색소침착","IPL","토닝","피부톤"]', 37.5571, 126.9249, 189, 30, true, true);

-- 추가 인기 콘텐츠 (조회수 높은)
INSERT INTO feed_contents (hospital_id, category, photo_urls, description, pricing_info, tags, lat, lng, view_count, like_count, is_approved, is_active) VALUES
(1, '성형외과', '["https://picsum.photos/seed/hot1/800/1200","https://picsum.photos/seed/hot1b/800/1200","https://picsum.photos/seed/hot1c/800/1200","https://picsum.photos/seed/hot1d/800/1200"]',
 '동안성형 풀패키지 결과입니다. 눈·코·턱 세 부위를 조화롭게 수술하여 10살은 어려 보이는 효과를 얻었습니다.',
 '동안성형 풀패키지 비급여: 별도 상담',
 '["동안성형","풀패키지","눈코턱","안티에이징"]', 37.4979, 127.0276, 1023, 156, true, true),

(4, '성형외과', '["https://picsum.photos/seed/hot2/800/1200","https://picsum.photos/seed/hot2b/800/1200"]',
 '남성 코성형 결과입니다. 남성스러운 직선 라인으로 세련된 느낌을 살렸습니다.',
 '남성 코성형 비급여: 300만원~450만원',
 '["남성코성형","남자코","직선코"]', 37.4845, 127.0287, 678, 98, true, true),

(2, '피부과', '["https://picsum.photos/seed/hot3/800/1200","https://picsum.photos/seed/hot3b/800/1200"]',
 '탈모 치료 6개월 후 결과입니다. PRP와 두피 메조테라피 병행으로 모발이 풍성해졌습니다.',
 'PRP 비급여: 1회 20만원 / 메조테라피 1회 15만원',
 '["탈모치료","PRP","두피","모발"]', 37.5013, 127.0246, 892, 134, true, true),

(6, '피부과', '["https://picsum.photos/seed/hot4/800/1200"]',
 '여드름 관리 프로그램 8주 결과입니다. 심한 여드름이 깨끗하게 개선되었습니다.',
 '여드름 프로그램 비급여: 8주 80만원~120만원',
 '["여드름","여드름치료","트러블","피부관리"]', 37.5553, 126.9226, 756, 112, true, true);

-- 리뷰 카운트와 평점 업데이트 (더 현실감 있게)
UPDATE hospitals SET avg_rating = 4.7, review_count = 128 WHERE hospital_id = 1;
UPDATE hospitals SET avg_rating = 4.5, review_count = 95 WHERE hospital_id = 2;
UPDATE hospitals SET avg_rating = 4.8, review_count = 76 WHERE hospital_id = 3;
UPDATE hospitals SET avg_rating = 4.6, review_count = 112 WHERE hospital_id = 4;
UPDATE hospitals SET avg_rating = 4.9, review_count = 203 WHERE hospital_id = 5;
UPDATE hospitals SET avg_rating = 4.4, review_count = 67 WHERE hospital_id = 6;
UPDATE hospitals SET avg_rating = 4.3, review_count = 54 WHERE hospital_id = 7;
UPDATE hospitals SET avg_rating = 4.7, review_count = 89 WHERE hospital_id = 8;
UPDATE hospitals SET avg_rating = 4.5, review_count = 145 WHERE hospital_id = 9;
UPDATE hospitals SET avg_rating = 4.6, review_count = 78 WHERE hospital_id = 10;
