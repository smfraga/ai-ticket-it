import { AppError } from "../errors/AppError.js";

const MENSAJES_DE_ERRORES_DEL_BODY = {
  "entity.parse.failed": "El cuerpo de la request no es un JSON válido",
  "entity.too.large": "El cuerpo de la request supera el tamaño máximo permitido",
};

// Middleware global de errores: lleva 4 parámetros y se registra al final de app.js.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
      timestamp: err.timestamp,
    });
  }

  // Errores de express.json() (JSON mal formado o demasiado grande).
  if (err.expose && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      status: "fail",
      message: MENSAJES_DE_ERRORES_DEL_BODY[err.type] ?? err.message,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(500).json({
    status: "error",
    message: "Error interno del servidor",
    timestamp: new Date().toISOString(),
  });
}
