import { describe, expect, it } from "@jest/globals";
import { Compra } from "../../domain/Compra.js";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import { ConflictError, ForbiddenError } from "../../errors/AppError.js";
import {
  AHORA,
  crearComprador,
  crearCompraEn,
  crearEvento,
  crearOrganizador,
  enDias,
} from "../helpers/domainFactories.js";

const { PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA } = estadoCompra;

function eventoDeOlivia() {
  const olivia = crearOrganizador({ id: "olivia" });
  return { olivia, evento: crearEvento({ organizador: olivia }) };
}

describe("Evento.cancelar", () => {
  it("un evento nace sin cancelar y su organizador lo cancela", () => {
    const { evento, olivia } = eventoDeOlivia();
    expect(evento.cancelado).toBe(false);

    evento.cancelar(olivia, AHORA);

    expect(evento.cancelado).toBe(true);
  });

  it("solo lo cancela su organizador (403)", () => {
    const { evento } = eventoDeOlivia();

    expect(() => evento.cancelar(crearOrganizador({ id: "octavio" }), AHORA)).toThrow(
      new ForbiddenError("Solo el organizador del evento puede cancelarlo"),
    );
    expect(evento.cancelado).toBe(false);
  });

  it("no cancela un evento ya realizado ni uno ya cancelado (409)", () => {
    const { evento, olivia } = eventoDeOlivia();

    expect(() => evento.cancelar(olivia, enDias(31))).toThrow(
      new ConflictError("No se puede cancelar un evento que ya se realizó"),
    );
    evento.cancelar(olivia, AHORA);
    expect(() => evento.cancelar(olivia, AHORA)).toThrow(new ConflictError("El evento ya está cancelado"));
  });

  it("un evento cancelado no se edita (409)", () => {
    const { evento, olivia } = eventoDeOlivia();
    evento.cancelar(olivia, AHORA);

    expect(() => evento.editar({ nombre: "Otro" }, olivia, AHORA)).toThrow(
      new ConflictError("No se puede editar un evento cancelado"),
    );
  });
});

describe("Compra y evento cancelado", () => {
  it("no se compran entradas de un evento cancelado (409) y no se reserva cupo", () => {
    const { evento, olivia } = eventoDeOlivia();
    evento.cancelar(olivia, AHORA);

    expect(() => new Compra(crearComprador(), evento, evento.tiposEntrada[0], 1, AHORA)).toThrow(
      new ConflictError("No se pueden comprar entradas de un evento cancelado"),
    );
    expect(evento.tiposEntrada[0].vendidas).toBe(0);
  });

  it("no se paga una compra de un evento cancelado (409)", () => {
    const { evento } = eventoDeOlivia();
    const compra = crearCompraEn(PENDIENTE, { evento });
    evento.cancelado = true; // sin pasar por cancelarPorEvento, para probar la regla de `pagar` sola

    expect(() => compra.pagar(compra.comprador, AHORA)).toThrow(
      new ConflictError("No se puede pagar una compra de un evento cancelado"),
    );
    expect(compra.estado).toBe(PENDIENTE);
  });
});

describe("Compra.cancelarPorEvento", () => {
  it("una CONFIRMADA queda REEMBOLSADA, pasando por CANCELADA, con el organizador como responsable", () => {
    const { evento, olivia } = eventoDeOlivia();
    const compra = crearCompraEn(CONFIRMADA, { evento });

    expect(compra.cancelarPorEvento(olivia, enDias(1))).toBe(true);

    expect(compra.estado).toBe(REEMBOLSADA);
    expect(compra.historial.slice(-2)).toEqual([
      expect.objectContaining({ estado: CANCELADA, quien: olivia, fechaHora: enDias(1) }),
      expect.objectContaining({ estado: REEMBOLSADA, quien: olivia, fechaHora: enDias(1) }),
    ]);
  });

  it("una PENDIENTE queda CANCELADA (sin reembolso) y libera el cupo", () => {
    const { evento, olivia } = eventoDeOlivia();
    const compra = crearCompraEn(PENDIENTE, { evento, cantidad: 3 });
    expect(evento.tiposEntrada[0].vendidas).toBe(3);

    expect(compra.cancelarPorEvento(olivia, AHORA)).toBe(true);

    expect(compra.estado).toBe(CANCELADA);
    expect(evento.tiposEntrada[0].vendidas).toBe(0);
  });

  it("no toca las compras que ya no están activas", () => {
    const { evento, olivia } = eventoDeOlivia();
    for (const estado of [UTILIZADA, CANCELADA, REEMBOLSADA]) {
      const compra = crearCompraEn(estado, { evento });
      const historial = compra.historial.length;

      expect(compra.cancelarPorEvento(olivia, AHORA)).toBe(false);
      expect(compra.estado).toBe(estado);
      expect(compra.historial).toHaveLength(historial);
    }
  });

  it("solo la cancela el organizador del evento (403)", () => {
    const { evento } = eventoDeOlivia();
    const compra = crearCompraEn(CONFIRMADA, { evento });

    expect(() => compra.cancelarPorEvento(compra.comprador, AHORA)).toThrow(
      new ForbiddenError("Solo el organizador del evento puede cancelar sus compras"),
    );
    expect(compra.estado).toBe(CONFIRMADA);
  });
});
