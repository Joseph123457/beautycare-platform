/**
 * 유효성 검사 미들웨어
 * express-validator의 검사 결과를 확인하고 에러가 있으면 응답을 반환한다.
 */
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      data: null,
      message: errors.array()[0].msg,
    });
  }
  next();
};

module.exports = validate;
