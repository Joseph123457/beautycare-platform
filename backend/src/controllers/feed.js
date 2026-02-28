/**
 * 피드 컨트롤러
 *
 * 엔드포인트:
 *   GET    /api/feed              — 피드 목록 조회 (공개)
 *   GET    /api/feed/hospital/mine — 내 병원 콘텐츠 목록 (HOSPITAL_ADMIN)
 *   GET    /api/feed/:id          — 피드 상세 조회 (공개)
 *   POST   /api/feed              — 피드 콘텐츠 생성 (HOSPITAL_ADMIN)
 *   PUT    /api/feed/:id          — 피드 콘텐츠 수정 (HOSPITAL_ADMIN)
 *   DELETE /api/feed/:id          — 피드 콘텐츠 삭제 (HOSPITAL_ADMIN)
 */
const FeedContent = require('../models/feedContent');
const Favorite = require('../models/favorite');
const Hospital = require('../models/hospital');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/feed
 * 피드 목록 조회 (공개, 랜덤 정렬)
 */
const getFeed = async (req, res, next) => {
  try {
    const { category, lat, lng, radius, cursor, limit } = req.query;

    const feed = await FeedContent.getFeed({
      category,
      lat,
      lng,
      radius,
      cursor,
      limit: limit ? parseInt(limit) : 10,
    });

    return successResponse(res, { contents: feed }, '피드 조회 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feed/:id
 * 피드 상세 조회 (조회수 증가, 즐겨찾기 여부 포함)
 */
const getDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const content = await FeedContent.findById(id);
    if (!content) {
      return errorResponse(res, '콘텐츠를 찾을 수 없습니다', 404);
    }

    // 조회수 증가
    await FeedContent.incrementViewCount(id);

    // 로그인한 사용자인 경우 즐겨찾기 여부 확인
    let isFavorited = false;
    if (req.user) {
      isFavorited = await Favorite.check(req.user.id, id);
    }

    return successResponse(res, {
      content: { ...content, is_favorited: isFavorited },
    }, '콘텐츠 상세 조회 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/feed
 * 피드 콘텐츠 생성 (HOSPITAL_ADMIN 전용)
 */
const create = async (req, res, next) => {
  try {
    // 병원 소유자 확인
    const hospital = await Hospital.findByOwnerId(req.user.id);
    if (!hospital) {
      return errorResponse(res, '소유한 병원이 없습니다', 403);
    }

    // 업로드된 사진 URL 생성
    const photoUrls = req.files
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : [];

    if (photoUrls.length === 0) {
      return errorResponse(res, '최소 1장의 사진이 필요합니다', 400);
    }

    const { category, description, pricing_info, tags, lat, lng } = req.body;

    const content = await FeedContent.create({
      hospital_id: hospital.hospital_id,
      category: category || hospital.category,
      photo_urls: photoUrls,
      description,
      pricing_info,
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
      lat: lat || hospital.lat,
      lng: lng || hospital.lng,
    });

    return successResponse(res, { content }, '콘텐츠가 등록되었습니다. 관리자 승인 후 공개됩니다.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/feed/:id
 * 피드 콘텐츠 수정 (HOSPITAL_ADMIN + 소유자만)
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 콘텐츠 존재 확인
    const content = await FeedContent.findById(id);
    if (!content) {
      return errorResponse(res, '콘텐츠를 찾을 수 없습니다', 404);
    }

    // 소유 병원 확인
    const hospital = await Hospital.findByOwnerId(req.user.id);
    if (!hospital || hospital.hospital_id !== content.hospital_id) {
      return errorResponse(res, '본인 병원의 콘텐츠만 수정할 수 있습니다', 403);
    }

    const { category, description, pricing_info, tags, photo_urls, lat, lng } = req.body;

    const updated = await FeedContent.update(id, {
      category,
      description,
      pricing_info,
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : undefined,
      photo_urls: photo_urls ? (typeof photo_urls === 'string' ? JSON.parse(photo_urls) : photo_urls) : undefined,
      lat,
      lng,
    });

    return successResponse(res, { content: updated }, '콘텐츠가 수정되었습니다');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/feed/:id
 * 피드 콘텐츠 삭제 (HOSPITAL_ADMIN + 소유자만)
 */
const deleteFeed = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 콘텐츠 존재 확인
    const content = await FeedContent.findById(id);
    if (!content) {
      return errorResponse(res, '콘텐츠를 찾을 수 없습니다', 404);
    }

    // 소유 병원 확인
    const hospital = await Hospital.findByOwnerId(req.user.id);
    if (!hospital || hospital.hospital_id !== content.hospital_id) {
      return errorResponse(res, '본인 병원의 콘텐츠만 삭제할 수 있습니다', 403);
    }

    await FeedContent.delete(id);

    return successResponse(res, null, '콘텐츠가 삭제되었습니다');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feed/hospital/mine
 * 내 병원 콘텐츠 목록 조회 (HOSPITAL_ADMIN 전용)
 */
const getMyContents = async (req, res, next) => {
  try {
    const hospital = await Hospital.findByOwnerId(req.user.id);
    if (!hospital) {
      return errorResponse(res, '소유한 병원이 없습니다', 403);
    }

    const { limit = 20, offset = 0 } = req.query;

    const contents = await FeedContent.findByHospitalId(
      hospital.hospital_id,
      parseInt(limit),
      parseInt(offset)
    );

    return successResponse(res, { contents }, '내 병원 콘텐츠 조회 성공');
  } catch (error) {
    next(error);
  }
};

module.exports = { getFeed, getDetail, create, update, deleteFeed, getMyContents };
