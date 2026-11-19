import { ValidationError } from "../errors/AppError.js";

export class Mensaje {
  usuario;
  mensaje;
  enviado;

  constructor(usuario, mensaje, enviado = new Date()) {
    if (!usuario) {
      throw new ValidationError("El mensaje debe tener un autor");
    }
    if (typeof mensaje !== "string" || !mensaje.trim()) {
      throw new ValidationError("El mensaje no puede estar vacío");
    }
    if (!(enviado instanceof Date) || isNaN(enviado)) {
      throw new ValidationError("La fecha de envío del mensaje debe ser una fecha válida");
    }

    this.usuario = usuario;
    this.mensaje = mensaje.trim();
    this.enviado = enviado;
  }
}
