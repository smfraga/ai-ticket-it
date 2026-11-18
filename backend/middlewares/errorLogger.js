import { AppError } from "../errors/AppError.js";

const LOGGER_SILENCIOSO = { error() {}, warn() {} };

// El mismo status que va a responder el errorHandler, así el log y la respuesta no se contradicen.
function statusDe(err) {
  if (err instanceof AppError) return err.statusCode;
  if (err.expose && err.status >= 400 && err.status < 500) return err.status;
  return 500;
}

// Registra los errores y los deja pasar al errorHandler (que es quien responde).
// Los 5xx son inesperados y llevan el stack; los 4xx son errores del cliente y alcanzan con una línea.
// Nunca registra el body ni los headers de la request: pueden traer contraseñas y tokens.
export function crearErrorLogger(logger = console) {
  return function errorLogger(err, req, res, next) {
    const status = statusDe(err);
    const pedido = `${req.method} ${req.originalUrl}`;

    if (status >= 500) {
      logger.error(`[${new Date().toISOString()}] ${pedido} -> ${status}`, err?.stack ?? err);
    } else {
      logger.warn(`[${new Date().toISOString()}] ${pedido} -> ${status}: ${err.message}`);
    }

    return next(err);
  };
}

// En los tests (Jest define NODE_ENV=test) no escribe nada, para no ensuciar la salida.
export const errorLogger = crearErrorLogger(process.env.NODE_ENV === "test" ? LOGGER_SILENCIOSO : console);
