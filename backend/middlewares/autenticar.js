import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../errors/AppError.js";

const PREFIJO_BEARER = "Bearer ";

// Deja en req.usuario lo que dice el token ({ id, roles }), sin consultar el repositorio.
// El service que necesite la entidad Usuario la busca por id.
export function autenticar(req, res, next) {
  const header = req.headers?.authorization;

  if (!header || !header.startsWith(PREFIJO_BEARER)) {
    return next(new UnauthorizedError("Falta el token de sesión"));
  }

  try {
    const payload = jwt.verify(header.slice(PREFIJO_BEARER.length), process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    req.usuario = { id: payload.sub, roles: payload.roles ?? [] };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError("La sesión expiró"));
    }
    return next(new UnauthorizedError("Token inválido"));
  }
}
