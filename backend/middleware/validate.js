const { validationResult } = require('express-validator');

// Runs after express-validator checks; short-circuits with a consistent
// { status, message, fieldErrors } shape if any check failed.
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fieldErrors = {};
    for (const err of errors.array()) {
      if (!fieldErrors[err.path]) fieldErrors[err.path] = err.msg;
    }
    return res.status(400).json({ status: 400, message: 'Validation failed', fieldErrors });
  }
  next();
}

module.exports = { handleValidation };
