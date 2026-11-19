import { randomUUID } from "node:crypto";

// Las más recientes primero, según cuándo nació la compra (primer cambio del historial).
const masRecientesPrimero = (a, b) => b.historial[0].fechaHora - a.historial[0].fechaHora;

export class CompraRepository {
  constructor() {
    this.compras = new Map();
  }

  async save(compra) {
    if (compra.id == null) {
      compra.id = randomUUID();
    }
    this.compras.set(compra.id, compra);
    return compra;
  }

  async findById(id) {
    return this.compras.get(id) ?? null;
  }

  async findByCompradorId(compradorId) {
    return [...this.compras.values()]
      .filter((compra) => compra.comprador.id === compradorId)
      .sort(masRecientesPrimero);
  }

  async findByEstado(estado) {
    return [...this.compras.values()].filter((compra) => compra.estado === estado);
  }

  async findByEventoId(eventoId) {
    return [...this.compras.values()]
      .filter((compra) => compra.evento.id === eventoId)
      .sort(masRecientesPrimero);
  }
}

export const compraRepository = new CompraRepository();
