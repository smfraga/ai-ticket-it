import { randomUUID } from "node:crypto";

// Versión mínima: los casos de uso de compras le van sumando las búsquedas que necesiten.
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
}

export const compraRepository = new CompraRepository();
