import { categoriaRepository } from "../repositories/CategoriaRepository.js";

export class CategoriaService {
  constructor(repositorioDeCategorias = categoriaRepository) {
    this.categoriaRepository = repositorioDeCategorias;
  }

  async getAll() {
    const categorias = await this.categoriaRepository.findAll();

    return categorias.map(({ id, nombre, descripcion }) => ({ id, nombre, descripcion }));
  }
}
