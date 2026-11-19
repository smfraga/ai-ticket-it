import { ValidationError } from "../errors/AppError.js";

export class Categoria {
  id;
  nombre;
  descripcion;

  constructor(nombre, descripcion = "") {
    if (typeof nombre !== "string" || !nombre.trim()) {
      throw new ValidationError("La categoría debe tener un nombre");
    }

    this.nombre = nombre;
    this.descripcion = descripcion;
  }
}
