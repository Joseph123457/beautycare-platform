/**
 * 즐겨찾기 컨트롤러
 *
 * 엔드포인트:
 *   POST   /api/favorites/:contentId — 즐겨찾기 추가
 *   DELETE /api/favorites/:contentId — 즐겨찾기 삭제
 *   GET    /api/favorites            — 내 즐겨찾기 목록
 */
const Favorite = require('../models/favorite');
const FeedContent = require('../models/feedContent');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * POST /api/favorites/:contentId
 * 즐겨찾기 추가
 */
const addFavorite = async (req, res, next) => {
  try {
    const { contentId } = req.params;

    // 콘텐츠 존재 확인
    const content = await FeedContent.findById(contentId);
    if (!content) {
      return errorResponse(res, '콘텐츠를 찾을 수 없습니다', 404);
    }

    await Favorite.add(req.user.id, contentId);

    return successResponse(res, null, '즐겨찾기에 추가되었습니다', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/favorites/:contentId
 * 즐겨찾기 삭제
 */
const removeFavorite = async (req, res, next) => {
  try {
    const { contentId } = req.params;

    await Favorite.remove(req.user.id, contentId);

    return successResponse(res, null, '즐겨찾기가 삭제되었습니다');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/favorites
 * 내 즐겨찾기 목록 조회
 */
const getMyFavorites = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const favorites = await Favorite.findByUserId(
      req.user.id,
      parseInt(limit),
      parseInt(offset)
    );

    return successResponse(res, { favorites }, '즐겨찾기 조회 성공');
  } catch (error) {
    next(error);
  }
};

module.exports = { addFavorite, removeFavorite, getMyFavorites };
