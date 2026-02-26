/**
 * 의료관광 가이드 컨트롤러
 *
 * 외국인 환자를 위한 가이드 콘텐츠(아티클·체크리스트)와 회복 숙소 정보를 제공한다.
 *
 * 엔드포인트:
 *   GET /api/guide/articles        — 가이드 아티클 목록
 *   GET /api/guide/articles/:id    — 가이드 아티클 상세
 *   GET /api/guide/recovery-houses — 회복 숙소 목록
 *   GET /api/guide/checklist       — 의료관광 체크리스트
 */
const { GuideArticle, RecoveryHouse } = require('../models/guide');
const { successResponse, errorResponse } = require('../utils/response');

/* ── 1. 가이드 아티클 목록 ───────────────────────────── */

/**
 * GET /api/guide/articles
 *
 * 공개 API (인증 불필요)
 * 쿼리 파라미터:
 *   - category (선택): VISA | RECOVERY | TRANSPORT | ACCOMMODATION | INSURANCE | PROCEDURE
 *   - lang (선택): ko | en | ja | zh (기본 en)
 */
const getArticles = async (req, res, next) => {
  try {
    const { category, lang } = req.query;

    // 카테고리 검증 (입력된 경우)
    const validCategories = ['VISA', 'RECOVERY', 'TRANSPORT', 'ACCOMMODATION', 'INSURANCE', 'PROCEDURE'];
    if (category && !validCategories.includes(category)) {
      return errorResponse(res, `유효하지 않은 카테고리입니다. (${validCategories.join(', ')})`, 400);
    }

    // 언어는 미들웨어에서 감지된 req.language 사용, 쿼리 파라미터가 우선
    const language = lang || req.language || 'en';

    const articles = await GuideArticle.findAll({ category, lang: language });

    return successResponse(res, articles, '가이드 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

/* ── 2. 가이드 아티클 상세 ───────────────────────────── */

/**
 * GET /api/guide/articles/:id
 *
 * 공개 API
 * - 조회수 자동 증가
 * - 언어별 제목·본문 반환
 */
const getArticleById = async (req, res, next) => {
  try {
    const articleId = req.params.id;
    const language = req.query.lang || req.language || 'en';

    const article = await GuideArticle.findById(articleId, language);

    if (!article) {
      return errorResponse(res, '가이드 아티클을 찾을 수 없습니다', 404);
    }

    // 조회수 증가 (비동기, 실패해도 응답에 영향 없음)
    GuideArticle.incrementViewCount(articleId).catch(() => {});

    return successResponse(res, article, '가이드 상세 조회 성공');
  } catch (error) {
    next(error);
  }
};

/* ── 3. 회복 숙소 목록 ──────────────────────────────── */

/**
 * GET /api/guide/recovery-houses
 *
 * 공개 API
 * 쿼리 파라미터:
 *   - lat, lng (선택): 위치 기반 거리순 정렬
 *   - lang (선택): 언어별 설명 반환
 */
const getRecoveryHouses = async (req, res, next) => {
  try {
    const { lat, lng, lang } = req.query;
    const language = lang || req.language || 'en';

    const houses = await RecoveryHouse.findAll({
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      lang: language,
    });

    return successResponse(res, houses, '회복 숙소 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

/* ── 4. 의료관광 체크리스트 ──────────────────────────── */

/**
 * GET /api/guide/checklist
 *
 * 공개 API
 * 언어별 '시술 전 / 당일 / 시술 후' 체크리스트를 반환한다.
 * 쿼리 파라미터:
 *   - lang (선택): ko | en | ja | zh
 */
const getChecklist = async (req, res, next) => {
  try {
    const language = req.query.lang || req.language || 'en';

    // 언어별 체크리스트 데이터
    const checklists = {
      en: {
        before: {
          title: 'Before Your Trip',
          items: [
            { id: 1, text: 'Check passport validity (6+ months remaining)', icon: 'passport' },
            { id: 2, text: 'Apply for visa if required (C-3-3 Medical Tourism visa)', icon: 'visa' },
            { id: 3, text: 'Purchase travel insurance', icon: 'insurance' },
            { id: 4, text: 'Confirm clinic appointment and get confirmation letter', icon: 'hospital' },
            { id: 5, text: 'Book flight with extra recovery days', icon: 'flight' },
            { id: 6, text: 'Reserve recovery accommodation', icon: 'hotel' },
            { id: 7, text: 'Prepare medical records and prescriptions', icon: 'medical' },
            { id: 8, text: 'Stop blood-thinning medications (consult your doctor)', icon: 'pill' },
            { id: 9, text: 'Arrange airport pickup or transportation', icon: 'transport' },
            { id: 10, text: 'Download translation app and Korean map app (Naver Map)', icon: 'app' },
          ],
        },
        dayOf: {
          title: 'Day of Procedure',
          items: [
            { id: 11, text: 'Follow fasting instructions (usually 8 hours before)', icon: 'fasting' },
            { id: 12, text: 'Bring passport and insurance documents', icon: 'document' },
            { id: 13, text: 'Wear comfortable, loose clothing', icon: 'clothing' },
            { id: 14, text: 'Remove all jewelry and makeup', icon: 'jewelry' },
            { id: 15, text: 'Arrive 30 minutes early for paperwork', icon: 'clock' },
            { id: 16, text: 'Confirm interpreter availability', icon: 'interpreter' },
            { id: 17, text: 'Have emergency contact info ready', icon: 'emergency' },
          ],
        },
        after: {
          title: 'After Your Procedure',
          items: [
            { id: 18, text: 'Follow all post-op care instructions from your doctor', icon: 'instruction' },
            { id: 19, text: 'Take prescribed medications on schedule', icon: 'medication' },
            { id: 20, text: 'Attend all follow-up appointments before leaving Korea', icon: 'followup' },
            { id: 21, text: 'Keep the clinic\'s emergency contact number', icon: 'phone' },
            { id: 22, text: 'Stay hydrated and eat nutritious meals', icon: 'nutrition' },
            { id: 23, text: 'Avoid alcohol and smoking during recovery', icon: 'noalcohol' },
            { id: 24, text: 'Get a medical certificate for your return flight if needed', icon: 'certificate' },
            { id: 25, text: 'Confirm your flight schedule allows enough recovery time', icon: 'calendar' },
          ],
        },
      },
      ko: {
        before: {
          title: '시술 전 준비',
          items: [
            { id: 1, text: '여권 유효기간 확인 (6개월 이상 잔여)', icon: 'passport' },
            { id: 2, text: '비자 필요 여부 확인 및 신청 (C-3-3 의료관광 비자)', icon: 'visa' },
            { id: 3, text: '여행 보험 가입', icon: 'insurance' },
            { id: 4, text: '병원 예약 확인 및 확인서 수령', icon: 'hospital' },
            { id: 5, text: '회복 기간을 고려한 항공편 예약', icon: 'flight' },
            { id: 6, text: '회복 숙소 예약', icon: 'hotel' },
            { id: 7, text: '의료 기록 및 처방전 준비', icon: 'medical' },
            { id: 8, text: '혈액 희석 약물 중단 (주치의 상담)', icon: 'pill' },
            { id: 9, text: '공항 픽업 또는 교통편 예약', icon: 'transport' },
            { id: 10, text: '번역 앱 및 네이버 지도 다운로드', icon: 'app' },
          ],
        },
        dayOf: {
          title: '시술 당일',
          items: [
            { id: 11, text: '금식 안내 준수 (보통 8시간 전)', icon: 'fasting' },
            { id: 12, text: '여권 및 보험 서류 지참', icon: 'document' },
            { id: 13, text: '편안하고 헐렁한 옷 착용', icon: 'clothing' },
            { id: 14, text: '모든 장신구 및 화장 제거', icon: 'jewelry' },
            { id: 15, text: '서류 작성을 위해 30분 일찍 도착', icon: 'clock' },
            { id: 16, text: '통역사 배정 확인', icon: 'interpreter' },
            { id: 17, text: '비상 연락처 정보 준비', icon: 'emergency' },
          ],
        },
        after: {
          title: '시술 후',
          items: [
            { id: 18, text: '의사의 수술 후 관리 지침 준수', icon: 'instruction' },
            { id: 19, text: '처방 약물 스케줄에 따라 복용', icon: 'medication' },
            { id: 20, text: '귀국 전 모든 후속 진료 참석', icon: 'followup' },
            { id: 21, text: '병원 비상 연락처 보관', icon: 'phone' },
            { id: 22, text: '충분한 수분 섭취 및 영양가 있는 식사', icon: 'nutrition' },
            { id: 23, text: '회복 기간 중 음주 및 흡연 금지', icon: 'noalcohol' },
            { id: 24, text: '필요시 귀국 항공편용 의료 확인서 발급', icon: 'certificate' },
            { id: 25, text: '충분한 회복 기간을 고려한 항공편 일정 확인', icon: 'calendar' },
          ],
        },
      },
      ja: {
        before: {
          title: '施術前の準備',
          items: [
            { id: 1, text: 'パスポートの有効期限確認（残り6ヶ月以上）', icon: 'passport' },
            { id: 2, text: 'ビザの必要性確認・申請（C-3-3医療観光ビザ）', icon: 'visa' },
            { id: 3, text: '旅行保険への加入', icon: 'insurance' },
            { id: 4, text: 'クリニック予約確認書の取得', icon: 'hospital' },
            { id: 5, text: '回復期間を考慮した航空券予約', icon: 'flight' },
            { id: 6, text: '回復用宿泊施設の予約', icon: 'hotel' },
            { id: 7, text: '医療記録・処方箋の準備', icon: 'medical' },
            { id: 8, text: '血液希釈薬の中止（主治医に相談）', icon: 'pill' },
            { id: 9, text: '空港送迎・交通手段の手配', icon: 'transport' },
            { id: 10, text: '翻訳アプリとNaverマップのダウンロード', icon: 'app' },
          ],
        },
        dayOf: {
          title: '施術当日',
          items: [
            { id: 11, text: '絶食指示の遵守（通常8時間前から）', icon: 'fasting' },
            { id: 12, text: 'パスポートと保険書類の持参', icon: 'document' },
            { id: 13, text: '楽でゆったりした服装', icon: 'clothing' },
            { id: 14, text: 'アクセサリー・化粧を外す', icon: 'jewelry' },
            { id: 15, text: '書類記入のため30分前に到着', icon: 'clock' },
            { id: 16, text: '通訳の手配確認', icon: 'interpreter' },
            { id: 17, text: '緊急連絡先の準備', icon: 'emergency' },
          ],
        },
        after: {
          title: '施術後',
          items: [
            { id: 18, text: '医師の術後ケア指示を遵守', icon: 'instruction' },
            { id: 19, text: '処方薬をスケジュール通り服用', icon: 'medication' },
            { id: 20, text: '帰国前にすべてのフォローアップ診察に参加', icon: 'followup' },
            { id: 21, text: 'クリニックの緊急連絡先を保管', icon: 'phone' },
            { id: 22, text: '十分な水分補給と栄養のある食事', icon: 'nutrition' },
            { id: 23, text: '回復期間中の飲酒・喫煙を避ける', icon: 'noalcohol' },
            { id: 24, text: '必要に応じて帰国用の医療証明書を取得', icon: 'certificate' },
            { id: 25, text: '十分な回復期間を確保したフライトスケジュールの確認', icon: 'calendar' },
          ],
        },
      },
      zh: {
        before: {
          title: '术前准备',
          items: [
            { id: 1, text: '确认护照有效期（剩余6个月以上）', icon: 'passport' },
            { id: 2, text: '确认是否需要签证并申请（C-3-3医疗旅游签证）', icon: 'visa' },
            { id: 3, text: '购买旅行保险', icon: 'insurance' },
            { id: 4, text: '确认医院预约并获取确认函', icon: 'hospital' },
            { id: 5, text: '预订含恢复期的机票', icon: 'flight' },
            { id: 6, text: '预订恢复住所', icon: 'hotel' },
            { id: 7, text: '准备医疗记录和处方', icon: 'medical' },
            { id: 8, text: '停用血液稀释药物（请咨询医生）', icon: 'pill' },
            { id: 9, text: '安排机场接送或交通', icon: 'transport' },
            { id: 10, text: '下载翻译应用和韩国地图应用（Naver Map）', icon: 'app' },
          ],
        },
        dayOf: {
          title: '手术当天',
          items: [
            { id: 11, text: '遵守禁食要求（通常术前8小时）', icon: 'fasting' },
            { id: 12, text: '携带护照和保险文件', icon: 'document' },
            { id: 13, text: '穿着舒适宽松的衣物', icon: 'clothing' },
            { id: 14, text: '取下所有首饰和化妆', icon: 'jewelry' },
            { id: 15, text: '提前30分钟到达填写表格', icon: 'clock' },
            { id: 16, text: '确认翻译安排', icon: 'interpreter' },
            { id: 17, text: '准备好紧急联系人信息', icon: 'emergency' },
          ],
        },
        after: {
          title: '术后',
          items: [
            { id: 18, text: '遵循医生的术后护理指导', icon: 'instruction' },
            { id: 19, text: '按时服用处方药物', icon: 'medication' },
            { id: 20, text: '离开韩国前参加所有复诊', icon: 'followup' },
            { id: 21, text: '保存医院紧急联系电话', icon: 'phone' },
            { id: 22, text: '充分补水并摄取营养饮食', icon: 'nutrition' },
            { id: 23, text: '恢复期间避免饮酒和吸烟', icon: 'noalcohol' },
            { id: 24, text: '如需要，获取回程航班医疗证明', icon: 'certificate' },
            { id: 25, text: '确认航班时间留有充足恢复期', icon: 'calendar' },
          ],
        },
      },
    };

    // 지원 언어가 아니면 영어로 폴백
    const validLangs = ['ko', 'en', 'ja', 'zh'];
    const safeLang = validLangs.includes(language) ? language : 'en';

    return successResponse(res, checklists[safeLang], '체크리스트 조회 성공');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getArticles,
  getArticleById,
  getRecoveryHouses,
  getChecklist,
};
