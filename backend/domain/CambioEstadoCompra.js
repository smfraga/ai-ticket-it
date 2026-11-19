import { ValidationError } from "../errors/AppError.js";
import { estadoCompra } from "./EstadoCompra.js";

export class CambioEstadoCompra {
  estado;
  quien;
  fechaHora;

  constructor(estado, quien, fechaHora = new Date()) {
    if (!Object.values(estadoCompra).includes(estado)) {
      throw new ValidationError(`El estado ${estado} no es un estado de compra válido`);
    }
    if (!quien) {
      throw new ValidationError("El cambio de estado debe registrar quién lo hizo");
    }
    if (!(fechaHora instanceof Date) || isNaN(fechaHora)) {
      throw new ValidationError("La fecha del cambio de estado debe ser una fecha válida");
    }

    this.estado = estado;
    this.quien = quien;
    this.fechaHora = fechaHora;
  }
}
