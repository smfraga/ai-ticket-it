import { randomUUID } from "node:crypto";

// Versión mínima: el caso de uso de reseñas le suma las búsquedas que necesite.
export class ResenaRepository {
  constructor() {
    this.resenias = new Map();
  }

  async save(resenia) {
    if (resenia.id == null) {
      resenia.id = randomUUID();
    }
    this.resenias.set(resenia.id, resenia);
    return resenia;
  }

  async findById(id) {
    return this.resenias.get(id) ?? null;
  }

  // Las reseñas de todos los eventos de un organizador (base de su puntaje).
  async findByOrganizadorId(organizadorId) {
    return [...this.resenias.values()].filter(
      (resenia) => resenia.evento.organizador.id === organizadorId,
    );
  }
}

export const resenaRepository = new ResenaRepository();
