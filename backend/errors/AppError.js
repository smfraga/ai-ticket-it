export class AppError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = statusCode >= 500 ? "error" : "fail";
    this.timestamp = new Date().toISOString();
    if (details !== undefined) this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado", details) {
    super(message, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "No tenés permiso para realizar esta acción", details) {
    super(message, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message, details) {
    super(message, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message, details) {
    super(message, 409, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Hiciste demasiados intentos. Probá de nuevo en unos minutos", details) {
    super(message, 429, details);
  }
}
