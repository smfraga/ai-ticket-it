import { ConflictError, ValidationError } from "../errors/AppError.js";

function validarCantidad(cantidad) {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new ValidationError("La cantidad debe ser un número entero positivo");
  }
}

function validarDatos(nombre, precio, cupo) {
  if (typeof nombre !== "string" || !nombre.trim()) {
    throw new ValidationError("El tipo de entrada debe tener un nombre");
  }
  if (!Number.isFinite(precio) || precio < 0) {
    throw new ValidationError("El precio del tipo de entrada debe ser un número mayor o igual a 0");
  }
  if (!Number.isInteger(cupo) || cupo <= 0) {
    throw new ValidationError("El cupo del tipo de entrada debe ser un número entero positivo");
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
    validarDatos(nombre, precio, cupo);

    this.nombre = nombre;
    this.descripcion = descripcion;
    this.precio = precio;
    this.cupo = cupo;
    this.vendidas = 0;
  }

  tieneVentas() {
    return this.vendidas > 0;
  }

  // Lanza si la edición no es válida, sin tocar nada: el evento valida todos sus tipos antes de aplicar.
  // Con entradas vendidas el precio queda fijo (las compras ya se pagaron a ese precio) y el cupo no puede
  // quedar por debajo de lo vendido.
  validarEdicion({ nombre = this.nombre, precio = this.precio, cupo = this.cupo }) {
    validarDatos(nombre, precio, cupo);
    if (this.tieneVentas() && precio !== this.precio) {
      throw new ConflictError(`No se puede cambiar el precio de ${this.nombre}: ya tiene entradas vendidas`);
    }
    if (cupo < this.vendidas) {
      throw new ConflictError(
        `El cupo de ${this.nombre} no puede ser menor a las ${this.vendidas} entradas vendidas`,
      );
    }
  }

  editar(datos) {
    this.validarEdicion(datos);
    const { nombre = this.nombre, descripcion = this.descripcion, precio = this.precio, cupo = this.cupo } = datos;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.precio = precio;
    this.cupo = cupo;
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
