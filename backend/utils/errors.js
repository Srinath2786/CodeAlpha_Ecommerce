class ApiException extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class NotFoundError extends ApiException {
  constructor(message) { super(404, message); }
}
class BadRequestError extends ApiException {
  constructor(message) { super(400, message); }
}
class ConflictError extends ApiException {
  constructor(message) { super(409, message); }
}

// Express error-handling middleware — must be registered last, with 4 args.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ApiException) {
    return res.status(err.status).json({ status: err.status, message: err.message });
  }
  console.error(err);
  return res.status(500).json({ status: 500, message: 'An unexpected error occurred. Please try again.' });
}

module.exports = { ApiException, NotFoundError, BadRequestError, ConflictError, errorHandler };
