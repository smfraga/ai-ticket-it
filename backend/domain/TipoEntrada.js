import { ConflictError, ValidationError } from "../errors/AppError.js";

function validarCantidad(cantidad) {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new ValidationError("La cantidad debe ser un número entero positivo");
  }
}

export class TipoEntrada {
  id
  nombre
  descripcion
  precio
  cupo
  vendidas

  constructor(nombre, descripcion, precio, cupo) {
    if (typeof nombre !== "string" || !nombre.trim()) {
      throw new ValidationError("El tipo de entrada debe tener un nombre");
    }
    if (!Number.isFinite(precio) || precio < 0) {
      throw new ValidationError("El precio del tipo de entrada debe ser un número mayor o igual a 0");
    }
    if (!Number.isInteger(cupo) || cupo <= 0) {
      throw new ValidationError("El cupo del tipo de entrada debe ser un número entero positivo");
    }

    this.nombre = nombre;
    this.descripcion = descripcion;
    this.precio = precio;
    this.cupo = cupo;
    this.vendidas = 0;
  }

  disponibles() {
    return this.cupo - this.vendidas;
  }

  hayCupoPara(cantidad) {
    return Number.isInteger(cantidad) && cantidad > 0 && cantidad <= this.disponibles();
  }

  reservar(cantidad) {
    validarCantidad(cantidad);
    if (!this.hayCupoPara(cantidad)) {
      throw new ConflictError(
        `No hay cupo suficiente para ${this.nombre}: quedan ${this.disponibles()} entradas`,
      );
    }
    this.vendidas += cantidad;
  }

  liberar(cantidad) {
    validarCantidad(cantidad);
    if (cantidad > this.vendidas) {
      throw new ConflictError("No se pueden liberar más entradas de las vendidas");
    }
    this.vendidas -= cantidad;
  }
}
