import { ConflictError, ForbiddenError, ValidationError } from "../errors/AppError.js";

export const PUNTUACION_MINIMA = 1;
export const PUNTUACION_MAXIMA = 5;

// "Una reseña por compra" se controla en el service, porque necesita el repositorio.
export class Resenia {
  id
  compra
  comprador
  evento
  puntuacion
  detalle
  fecha

  constructor(compra, autor, puntuacion, detalle, fecha = new Date()) {
    if (!compra) {
      throw new ValidationError("La reseña debe ser de una compra");
    }
    if (!compra.comprador.esElMismo(autor)) {
      throw new ForbiddenError("Solo el comprador puede reseñar su compra");
    }
    if (!compra.estaUtilizada()) {
      throw new ConflictError("Solo se puede reseñar una compra utilizada");
    }
    if (
      !Number.isInteger(puntuacion) ||
      puntuacion < PUNTUACION_MINIMA ||
      puntuacion > PUNTUACION_MAXIMA
    ) {
      throw new ValidationError(
        `La puntuación debe ser un número entero entre ${PUNTUACION_MINIMA} y ${PUNTUACION_MAXIMA}`,
      );
    }
    if (typeof detalle !== "string" || !detalle.trim()) {
      throw new ValidationError("La reseña debe tener un comentario");
    }
    if (!(fecha instanceof Date) || isNaN(fecha)) {
      throw new ValidationError("La fecha de la reseña debe ser una fecha válida");
    }

    this.compra = compra;
    this.comprador = compra.comprador;
    this.evento = compra.evento;
    this.puntuacion = puntuacion;
    this.detalle = detalle;
    this.fecha = fecha;
  }
}
