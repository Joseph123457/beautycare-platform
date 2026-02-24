/**
 * API 응답 헬퍼
 * 통일된 응답 형식 { success, data, message }을 생성한다.
 */

/**
 * 성공 응답
 * @param {object} res - Express 응답 객체
 * @param {object|null} data - 응답 데이터
 * @param {string} message - 응답 메시지
 * @param {number} statusCode - HTTP 상태 코드 (기본: 200)
 */
const successResponse = (res, data = null, message = '요청이 성공했습니다', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

/**
 * 에러 응답
 * @param {object} res - Express 응답 객체
 * @param {string} message - 에러 메시지
 * @param {number} statusCode - HTTP 상태 코드 (기본: 500)
 */
const errorResponse = (res, message = '서버 오류가 발생했습니다', statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
  });
};

module.exports = { successResponse, errorResponse };
