import { randomUUID } from "node:crypto";

// Persistencia en memoria. Solo guarda y devuelve: filtrar y ordenar es trabajo del service.
export class EventoRepository {
  constructor() {
    this.eventos = new Map();
  }

  async save(evento) {
    if (evento.id == null) {
      evento.id = randomUUID();
    }
    // Los tipos de entrada son parte del evento (como subdocumentos), pero la compra
    // los va a indicar por id, así que cada uno necesita el suyo.
    for (const tipoEntrada of evento.tiposEntrada) {
      if (tipoEntrada.id == null) {
        tipoEntrada.id = randomUUID();
      }
    }
    this.eventos.set(evento.id, evento);
    return evento;
  }

  async findById(id) {
    return this.eventos.get(id) ?? null;
  }

  async findAll() {
    return [...this.eventos.values()];
  }
}

export const eventoRepository = new EventoRepository();
