import { randomUUID } from "node:crypto";

// Persistencia en memoria, con la misma interfaz async que tendría un repositorio sobre una base.
export class CategoriaRepository {
  constructor() {
    this.categorias = new Map();
  }

  async save(categoria) {
    if (categoria.id == null) {
      categoria.id = randomUUID();
    }
    this.categorias.set(categoria.id, categoria);
    return categoria;
  }

  async findById(id) {
    return this.categorias.get(id) ?? null;
  }

  async findAll() {
    return [...this.categorias.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }
}

export const categoriaRepository = new CategoriaRepository();
