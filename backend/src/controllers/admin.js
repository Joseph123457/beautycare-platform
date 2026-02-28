/**
 * 관리자 컨트롤러 (SUPER_ADMIN 전용)
 *
 * 엔드포인트:
 *   GET  /api/admin/hospitals        — 병원 목록 (검색 포함)
 *   GET  /api/admin/users            — 사용자 목록 (검색 포함)
 *   PUT  /api/admin/users/:id/role   — 사용자 역할 변경
 *   GET  /api/admin/contents/pending — 승인 대기 콘텐츠 목록
 *   PUT  /api/admin/contents/:id/approve — 콘텐츠 승인
 *   PUT  /api/admin/contents/:id/reject  — 콘텐츠 거절
 *   GET  /api/admin/stats            — 전체 통계
 */
const { pool } = require('../config/database');
const FeedContent = require('../models/feedContent');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/admin/hospitals
 * 병원 목록 조회 (검색, 페이지네이션)
 */
const getHospitals = async (req, res, next) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT hospital_id, name, address, category, avg_rating, review_count, created_at
      FROM hospitals
    `;
    const params = [];
    let paramIdx = 1;

    // 검색 필터
    if (search) {
      query += ` WHERE name ILIKE $${paramIdx} OR address ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // 전체 개수 조회
    let countQuery = 'SELECT COUNT(*) FROM hospitals';
    const countParams = [];
    if (search) {
      countQuery += ' WHERE name ILIKE $1 OR address ILIKE $1';
      countParams.push(`%${search}%`);
    }
    const countResult = await pool.query(countQuery, countParams);

    return successResponse(res, {
      hospitals: result.rows,
      total: parseInt(countResult.rows[0].count),
    }, '병원 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users
 * 사용자 목록 조회 (검색, 페이지네이션)
 */
const getUsers = async (req, res, next) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT user_id, email, name, phone, role, created_at
      FROM users
    `;
    const params = [];
    let paramIdx = 1;

    // 검색 필터
    if (search) {
      query += ` WHERE name ILIKE $${paramIdx} OR email ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // 전체 개수 조회
    let countQuery = 'SELECT COUNT(*) FROM users';
    const countParams = [];
    if (search) {
      countQuery += ' WHERE name ILIKE $1 OR email ILIKE $1';
      countParams.push(`%${search}%`);
    }
    const countResult = await pool.query(countQuery, countParams);

    return successResponse(res, {
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
    }, '사용자 목록 조회 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/users/:id/role
 * 사용자 역할 변경
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // 유효한 역할인지 확인
    const validRoles = ['PATIENT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
      return errorResponse(res, '유효하지 않은 역할입니다', 400);
    }

    // 자기 자신의 역할은 변경 불가
    if (parseInt(id) === req.user.id) {
      return errorResponse(res, '자신의 역할은 변경할 수 없습니다', 400);
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING user_id, email, name, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, '사용자를 찾을 수 없습니다', 404);
    }

    return successResponse(res, { user: result.rows[0] }, '역할이 변경되었습니다');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/contents/pending
 * 승인 대기 콘텐츠 목록
 */
const getPendingContents = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const contents = await FeedContent.getPending(
      parseInt(limit),
      parseInt(offset)
    );

    return successResponse(res, { contents }, '대기 콘텐츠 조회 성공');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/contents/:id/approve
 * 콘텐츠 승인
 */
const approveContent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const content = await FeedContent.approve(id);
    if (!content) {
      return errorResponse(res, '콘텐츠를 찾을 수 없습니다', 404);
    }

    return successResponse(res, { content }, '콘텐츠가 승인되었습니다');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/contents/:id/reject
 * 콘텐츠 거절
 */
const rejectContent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const content = await FeedContent.reject(id);
    if (!content) {
      return errorResponse(res, '콘텐츠를 찾을 수 없습니다', 404);
    }

    return successResponse(res, { content }, '콘텐츠가 거절되었습니다');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/stats
 * 전체 통계 조회
 */
const getStats = async (req, res, next) => {
  try {
    const [usersResult, hospitalsResult, contentsResult, pendingResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM hospitals'),
      pool.query('SELECT COUNT(*) FROM feed_contents WHERE is_active = true'),
      pool.query('SELECT COUNT(*) FROM feed_contents WHERE is_approved = false AND is_active = true'),
    ]);

    return successResponse(res, {
      stats: {
        totalUsers: parseInt(usersResult.rows[0].count),
        totalHospitals: parseInt(hospitalsResult.rows[0].count),
        totalContents: parseInt(contentsResult.rows[0].count),
        pendingContents: parseInt(pendingResult.rows[0].count),
      },
    }, '통계 조회 성공');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHospitals,
  getUsers,
  updateUserRole,
  getPendingContents,
  approveContent,
  rejectContent,
  getStats,
};
