/**
 * Typed application error classes.
 *
 * All errors carry:
 *   - message   — human-readable description
 *   - code      — machine-readable constant (for frontend switch logic)
 *   - status    — HTTP status code
 *   - details   — optional array of field-level validation messages
 *
 * Usage:
 *   throw new NotFoundError('User not found');
 *   throw new ValidationError('Invalid input', [{ field: 'email', message: 'Invalid format' }]);
 */

class AppError extends Error {
  constructor(message, status, code, details = []) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = []) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  AuthenticationError,
  ConflictError,
  InternalError,
};
