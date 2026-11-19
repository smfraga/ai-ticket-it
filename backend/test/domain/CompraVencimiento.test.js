import { describe, expect, it } from "@jest/globals";
import { PLAZO_DE_PAGO_DIAS } from "../../domain/Compra.js";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import { ID_USUARIO_SISTEMA, USUARIO_SISTEMA } from "../../domain/UsuarioSistema.js";
import { ConflictError } from "../../errors/AppError.js";
import { crearCompra, crearCompraEn, crearEvento, crearUsuario, enDias } from "../helpers/domainFactories.js";

const { PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA } = estadoCompra;

// Compra PENDIENTE hecha en AHORA de un evento dentro de `diasAlEvento` días.
const pendiente = (diasAlEvento = 30, cantidad = 2) =>
  crearCompra({ evento: crearEvento({ fecha: enDias(diasAlEvento) }), cantidad });

describe("USUARIO_SISTEMA", () => {
  it("se llama AI Ticket It, no tiene roles y solo es igual a sí mismo", () => {
    expect(USUARIO_SISTEMA).toMatchObject({ id: ID_USUARIO_SISTEMA, nombre: "AI Ticket It", apellido: "" });
    expect(USUARIO_SISTEMA.tieneRol("COMPRADOR")).toBe(false);
    expect(USUARIO_SISTEMA.esElMismo(USUARIO_SISTEMA)).toBe(true);
    expect(USUARIO_SISTEMA.esElMismo(crearUsuario({ id: "carla" }))).toBe(false);
    expect(USUARIO_SISTEMA.esElMismo(null)).toBe(false);
    expect(Object.isFrozen(USUARIO_SISTEMA)).toBe(true);
  });
});

describe("Compra.fechaLimiteDePago", () => {
  it("el plazo es de 7 días", () => {
    expect(PLAZO_DE_PAGO_DIAS).toBe(7);
  });

  it("es 7 días después de la compra si el evento es más adelante", () => {
    expect(pendiente(30).fechaLimiteDePago()).toEqual(enDias(7));
  });

  it("es el inicio del evento si el evento es antes de los 7 días", () => {
    expect(pendiente(5).fechaLimiteDePago()).toEqual(enDias(5));
  });

  it("se cuenta desde la compra, no desde hoy", () => {
    const compra = crearCompra({ evento: crearEvento({ fecha: enDias(30) }), ahora: enDias(-3) });

    expect(compra.fechaLimiteDePago()).toEqual(enDias(4));
  });

  it("es null si la compra no está PENDIENTE", () => {
    for (const estado of [CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA]) {
      expect(crearCompraEn(estado).fechaLimiteDePago()).toBeNull();
    }
  });
});

describe("Compra.vencer", () => {
  it("antes del límite no hace nada", () => {
    const compra = pendiente(30);
    const unMinutoAntes = new Date(enDias(7).getTime() - 60 * 1000);

    expect(compra.vencer(unMinutoAntes)).toBe(false);
    expect(compra.estado).toBe(PENDIENTE);
    expect(compra.historial).toHaveLength(1);
  });

  it("justo en el límite la cancela, con el sistema como responsable, y libera el cupo", () => {
    const compra = pendiente(30, 3);
    const tipo = compra.tipoEntrada;
    expect(tipo.vendidas).toBe(3);

    expect(compra.vencer(enDias(7))).toBe(true);

    expect(compra.estado).toBe(CANCELADA);
    expect(compra.historial.at(-1)).toMatchObject({ estado: CANCELADA, quien: USUARIO_SISTEMA, fechaHora: enDias(7) });
    expect(tipo.vendidas).toBe(0);
  });

  it("vence al empezar el evento si es antes de los 7 días", () => {
    const compra = pendiente(2);

    expect(compra.vencer(new Date(enDias(2).getTime() - 1))).toBe(false);
    expect(compra.vencer(enDias(2))).toBe(true);
  });

  it("no toca compras que no están PENDIENTE, aunque sean viejas", () => {
    for (const estado of [CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA]) {
      const compra = crearCompraEn(estado);
      expect(compra.vencer(enDias(60))).toBe(false);
      expect(compra.estado).toBe(estado);
    }
  });

  it("una compra vencida ya no vence otra vez", () => {
    const compra = pendiente(30);
    compra.vencer(enDias(8));

    expect(compra.vencer(enDias(9))).toBe(false);
    expect(compra.historial).toHaveLength(2);
  });
});

describe("Compra.pagar con el plazo vencido", () => {
  it("no se paga una compra cuyo plazo venció aunque todavía no se haya procesado (409)", () => {
    const compra = pendiente(30);

    expect(() => compra.pagar(compra.comprador, enDias(7))).toThrow(
      new ConflictError("Venció el plazo para pagar esta compra"),
    );
    expect(compra.estado).toBe(PENDIENTE);
  });

  it("un minuto antes del límite todavía se paga", () => {
    const compra = pendiente(30);

    compra.pagar(compra.comprador, new Date(enDias(7).getTime() - 60 * 1000));

    expect(compra.estado).toBe(CONFIRMADA);
    expect(compra.fechaLimiteDePago()).toBeNull();
  });

  it("si el evento ya pasó, el mensaje sigue siendo el del evento realizado", () => {
    const compra = pendiente(2);

    expect(() => compra.pagar(compra.comprador, enDias(3))).toThrow(
      new ConflictError("No se puede pagar una compra de un evento que ya se realizó"),
    );
  });
});
