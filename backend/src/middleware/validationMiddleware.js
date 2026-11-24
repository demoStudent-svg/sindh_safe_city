const { validationResult } = require("express-validator");

function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: result.array().map(({ path, msg }) => ({ field: path, message: msg }))
    });
  }
  next();
}

module.exports = validateRequest;
