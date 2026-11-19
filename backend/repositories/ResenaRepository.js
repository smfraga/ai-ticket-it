import { randomUUID } from "node:crypto";

// Las más recientes primero; a igual fecha se conserva el orden en que se guardaron.
const masRecientesPrimero = (a, b) => b.fecha - a.fecha;

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
    return [...this.resenias.values()]
      .filter((resenia) => resenia.evento.organizador.id === organizadorId)
      .sort(masRecientesPrimero);
  }

  // Las reseñas que dejó un comprador (para su perfil).
  async findByCompradorId(compradorId) {
    return [...this.resenias.values()]
      .filter((resenia) => resenia.comprador.id === compradorId)
      .sort(masRecientesPrimero);
  }

  async findByEventoId(eventoId) {
    return [...this.resenias.values()].filter((resenia) => resenia.evento.id === eventoId).sort(masRecientesPrimero);
  }

  // Una compra tiene a lo sumo una reseña: devuelve esa reseña o null.
  async findByCompraId(compraId) {
    return [...this.resenias.values()].find((resenia) => resenia.compra.id === compraId) ?? null;
  }
}

export const resenaRepository = new ResenaRepository();
