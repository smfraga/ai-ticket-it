import { ValidationError } from "../errors/AppError.js";

export function validate(validacion) {
  return (req, res, next) => {
    const resultado = validacion.safeParse(req.body);

    if (!resultado.success) {
      return next(new ValidationError("El cuerpo de la request es inválido", resultado.error.issues));
    }

    req.body = resultado.data;
    next();
  };
}
