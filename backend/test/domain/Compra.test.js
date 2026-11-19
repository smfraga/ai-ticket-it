import { describe, expect, it } from "@jest/globals";
import { Compra } from "../../domain/Compra.js";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import { rolUsuario } from "../../domain/RolUsuario.js";
import { ConflictError, ForbiddenError, ValidationError } from "../../errors/AppError.js";
import {
  AHORA,
  crearComprador,
  crearCompra,
  crearCompraEn,
  crearEvento,
  crearOrganizador,
  crearTipoEntrada,
  crearUsuario,
  enDias,
} from "../helpers/domainFactories.js";

const { PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA } = estadoCompra;

describe("Compra", () => {
  describe("al construirse", () => {
    it("queda PENDIENTE, calcula el total y reserva el cupo", () => {
      const evento = crearEvento();
      const general = evento.tiposEntrada[0];

      const compra = crearCompra({ evento, tipoEntrada: general, cantidad: 3 });

      expect(compra.estado).toBe(PENDIENTE);
      expect(compra.total).toBe(30000);
      expect(compra.mensajes).toEqual([]);
      expect(general.vendidas).toBe(3);
    });

    it("registra el primer cambio de estado: PENDIENTE, por el comprador, en ese momento", () => {
      const compra = crearCompra();

      expect(compra.historial).toHaveLength(1);
      expect(compra.historial[0]).toMatchObject({
        estado: PENDIENTE,
        quien: compra.comprador,
        fechaHora: AHORA,
      });
    });

    it("mantiene el total aunque después cambie el precio", () => {
      const compra = crearCompra({ cantidad: 2 });

      compra.tipoEntrada.precio = 99999;

      expect(compra.total).toBe(20000);
    });

    it("permite comprar justo el cupo que queda", () => {
      const evento = crearEvento({ tiposEntrada: [crearTipoEntrada({ cupo: 5 })] });

      const compra = crearCompra({ evento, cantidad: 5 });

      expect(compra.tipoEntrada.disponibles()).toBe(0);
    });

    it.each([
      ["el comprador", (e) => new Compra(null, e, e.tiposEntrada[0], 1, AHORA), "La compra debe tener un comprador"],
      ["el evento", (e) => new Compra(crearComprador(), null, e.tiposEntrada[0], 1, AHORA), "La compra debe ser de un evento"],
      ["el tipo de entrada", (e) => new Compra(crearComprador(), e, null, 1, AHORA), "La compra debe tener un tipo de entrada"],
    ])("lanza ValidationError si falta %s", (_, construir, mensaje) => {
      const evento = crearEvento();

      expect(() => construir(evento)).toThrow(ValidationError);
      expect(() => construir(evento)).toThrow(mensaje);
    });

    it.each([
      ["cero", 0],
      ["negativa", -1],
      ["decimal", 1.5],
      ["que no es número", "2"],
    ])("lanza ValidationError con cantidad %s, y no reserva", (_, cantidad) => {
      const evento = crearEvento();

      expect(() => crearCompra({ evento, cantidad })).toThrow(
        "La cantidad debe ser un número entero positivo",
      );
      expect(evento.tiposEntrada[0].vendidas).toBe(0);
    });

    it("lanza ValidationError si el tipo de entrada es de otro evento", () => {
      expect(() => crearCompra({ tipoEntrada: crearTipoEntrada() })).toThrow(
        "El tipo de entrada no pertenece al evento",
      );
    });

    it("lanza ForbiddenError si el usuario no tiene rol COMPRADOR, y no reserva", () => {
      const evento = crearEvento();
      const soloOrganizador = crearUsuario({ roles: [rolUsuario.ORGANIZADOR] });

      expect(() => crearCompra({ evento, comprador: soloOrganizador })).toThrow(ForbiddenError);
      expect(() => crearCompra({ evento, comprador: soloOrganizador })).toThrow(
        "Solo un usuario comprador puede comprar entradas",
      );
      expect(evento.tiposEntrada[0].vendidas).toBe(0);
    });

    it("lanza ConflictError si no hay cupo suficiente, y no reserva", () => {
      const evento = crearEvento({ tiposEntrada: [crearTipoEntrada({ cupo: 5 })] });

      expect(() => crearCompra({ evento, cantidad: 6 })).toThrow(ConflictError);
      expect(evento.tiposEntrada[0].vendidas).toBe(0);
    });

    it("lanza ConflictError si el evento ya se realizó, y no reserva", () => {
      const evento = crearEvento({ fecha: enDias(-1) });

      expect(() => crearCompra({ evento })).toThrow(ConflictError);
      expect(() => crearCompra({ evento })).toThrow(
        "No se pueden comprar entradas de un evento que ya se realizó",
      );
      expect(evento.tiposEntrada[0].vendidas).toBe(0);
    });
  });

  describe("estaConfirmada y estaUtilizada", () => {
    it.each([
      [PENDIENTE, false, false],
      [CONFIRMADA, true, false],
      [UTILIZADA, false, true],
      [CANCELADA, false, false],
      [REEMBOLSADA, false, false],
    ])("en %s devuelven %s y %s", (estado, confirmada, utilizada) => {
      const compra = crearCompraEn(estado);

      expect(compra.estaConfirmada()).toBe(confirmada);
      expect(compra.estaUtilizada()).toBe(utilizada);
    });
  });

  describe("actualizarEstado", () => {
    // Tabla de la decisión de Fase 0, escrita a mano para no depender del código que se prueba.
    const permitidas = {
      [PENDIENTE]: [CONFIRMADA, CANCELADA],
      [CONFIRMADA]: [UTILIZADA, CANCELADA],
      [CANCELADA]: [REEMBOLSADA],
      [UTILIZADA]: [],
      [REEMBOLSADA]: [],
    };
    const estados = Object.values(estadoCompra);
    const pares = estados.flatMap((desde) =>
      estados.map((hacia) => [desde, hacia, permitidas[desde].includes(hacia)]),
    );

    it.each(pares.filter(([, , valida]) => valida))(
      "permite pasar de %s a %s y registra el cambio",
      (desde, hacia) => {
        const compra = crearCompraEn(desde);
        const quien = compra.evento.organizador;
        const cuando = enDias(1);

        expect(compra.puedePasarA(hacia)).toBe(true);

        compra.actualizarEstado(hacia, quien, cuando);

        expect(compra.estado).toBe(hacia);
        expect(compra.historial.at(-1)).toMatchObject({ estado: hacia, quien, fechaHora: cuando });
      },
    );

    it.each(pares.filter(([, , valida]) => !valida))(
      "no permite pasar de %s a %s (ConflictError, sin cambios)",
      (desde, hacia) => {
        const compra = crearCompraEn(desde);
        const largoHistorial = compra.historial.length;

        expect(compra.puedePasarA(hacia)).toBe(false);
        expect(() => compra.actualizarEstado(hacia, compra.comprador)).toThrow(ConflictError);
        expect(() => compra.actualizarEstado(hacia, compra.comprador)).toThrow(
          `No se puede pasar una compra de ${desde} a ${hacia}`,
        );
        expect(compra.estado).toBe(desde);
        expect(compra.historial).toHaveLength(largoHistorial);
      },
    );

    it("lanza ValidationError con un estado que no existe", () => {
      const compra = crearCompra();

      expect(() => compra.actualizarEstado("PERDIDA", compra.comprador)).toThrow(
        "El estado PERDIDA no es un estado de compra válido",
      );
      expect(compra.estado).toBe(PENDIENTE);
    });

    it("lanza ValidationError si no se indica quién hace el cambio, sin cambiar el estado", () => {
      const compra = crearCompra();

      expect(() => compra.actualizarEstado(CONFIRMADA, null)).toThrow(
        "El cambio de estado debe registrar quién lo hizo",
      );
      expect(compra.estado).toBe(PENDIENTE);
      expect(compra.historial).toHaveLength(1);
    });

    describe("cupo", () => {
      it("UTILIZADA sigue ocupando el cupo", () => {
        expect(crearCompraEn(UTILIZADA, { cantidad: 2 }).tipoEntrada.vendidas).toBe(2);
      });

      it("CANCELADA libera el cupo", () => {
        expect(crearCompraEn(CANCELADA, { cantidad: 2 }).tipoEntrada.vendidas).toBe(0);
      });

      it("REEMBOLSADA no vuelve a liberar lo que ya liberó CANCELADA", () => {
        const evento = crearEvento();
        crearCompra({ evento, cantidad: 3 });
        const compra = crearCompraEn(REEMBOLSADA, { evento, cantidad: 2 });

        expect(compra.tipoEntrada.vendidas).toBe(3);
      });
    });
  });

  describe("cancelar", () => {
    it("una compra PENDIENTE pasa a CANCELADA y libera el cupo", () => {
      const compra = crearCompra({ cantidad: 2 });

      compra.cancelar(compra.comprador, AHORA);

      expect(compra.estado).toBe(CANCELADA);
      expect(compra.tipoEntrada.vendidas).toBe(0);
    });

    it("una compra CONFIRMADA pasa a CANCELADA y enseguida a REEMBOLSADA", () => {
      const compra = crearCompraEn(CONFIRMADA);

      compra.cancelar(compra.comprador, AHORA);

      expect(compra.estado).toBe(REEMBOLSADA);
      expect(compra.historial.map((cambio) => cambio.estado)).toEqual([
        PENDIENTE,
        CONFIRMADA,
        CANCELADA,
        REEMBOLSADA,
      ]);
      expect(compra.tipoEntrada.vendidas).toBe(0);
    });

    it("lanza ConflictError si la compra está UTILIZADA", () => {
      const compra = crearCompraEn(UTILIZADA);

      expect(() => compra.cancelar(compra.comprador, AHORA)).toThrow(
        "No se puede cancelar una compra utilizada",
      );
      expect(compra.estado).toBe(UTILIZADA);
    });

    it("lanza ConflictError si el evento ya se realizó", () => {
      const compra = crearCompraEn(CONFIRMADA);

      expect(() => compra.cancelar(compra.comprador, enDias(31))).toThrow(
        "No se puede cancelar una compra de un evento que ya se realizó",
      );
      expect(compra.estado).toBe(CONFIRMADA);
    });

    it.each([
      ["ya cancelada", CANCELADA],
      ["ya reembolsada", REEMBOLSADA],
    ])("lanza ConflictError si la compra está %s", (_, estado) => {
      const compra = crearCompraEn(estado);

      expect(() => compra.cancelar(compra.comprador, AHORA)).toThrow(ConflictError);
    });

    it("lanza ForbiddenError si la cancela otro usuario, aunque sea el organizador", () => {
      const compra = crearCompraEn(CONFIRMADA);

      expect(() => compra.cancelar(compra.evento.organizador, AHORA)).toThrow(ForbiddenError);
      expect(() => compra.cancelar(crearComprador(), AHORA)).toThrow(
        "Solo el comprador puede cancelar la compra",
      );
      expect(compra.estado).toBe(CONFIRMADA);
    });
  });

  describe("marcarUtilizada", () => {
    it("el organizador pasa una compra CONFIRMADA a UTILIZADA y queda en el historial", () => {
      const compra = crearCompraEn(CONFIRMADA);
      const organizador = compra.evento.organizador;

      compra.marcarUtilizada(organizador, AHORA);

      expect(compra.estado).toBe(UTILIZADA);
      const ultimo = compra.historial.at(-1);
      expect(ultimo.estado).toBe(UTILIZADA);
      expect(ultimo.quien).toBe(organizador);
    });

    it("sigue ocupando cupo", () => {
      const compra = crearCompraEn(CONFIRMADA, { cantidad: 2 });

      compra.marcarUtilizada(compra.evento.organizador, AHORA);

      expect(compra.tipoEntrada.vendidas).toBe(2);
    });

    it("lanza ForbiddenError si la marca el comprador", () => {
      const compra = crearCompraEn(CONFIRMADA);

      expect(() => compra.marcarUtilizada(compra.comprador, AHORA)).toThrow(ForbiddenError);
      expect(() => compra.marcarUtilizada(compra.comprador, AHORA)).toThrow(
        "Solo el organizador del evento puede marcar la compra como utilizada",
      );
      expect(compra.estado).toBe(CONFIRMADA);
    });

    it("lanza ForbiddenError si la marca el organizador de otro evento", () => {
      const compra = crearCompraEn(CONFIRMADA);

      expect(() => compra.marcarUtilizada(crearOrganizador(), AHORA)).toThrow(ForbiddenError);
      expect(compra.estado).toBe(CONFIRMADA);
    });

    it.each([
      ["PENDIENTE", PENDIENTE],
      ["CANCELADA", CANCELADA],
      ["REEMBOLSADA", REEMBOLSADA],
      ["UTILIZADA", UTILIZADA],
    ])("lanza ConflictError si la compra está %s", (_, estado) => {
      const compra = crearCompraEn(estado);

      expect(() => compra.marcarUtilizada(compra.evento.organizador, AHORA)).toThrow(ConflictError);
      expect(compra.estado).toBe(estado);
    });
  });

  describe("diasRestantes", () => {
    it("cuenta los días hasta el evento si está CONFIRMADA", () => {
      expect(crearCompraEn(CONFIRMADA).diasRestantes(AHORA)).toBe(30);
    });

    // Fechas en hora local: los días se cuentan por fecha de calendario, no por horas.
    describe("cuenta días de calendario", () => {
      const hoyALas = (horas, minutos = 0, dias = 0) => {
        const fecha = new Date(2026, 10, 19, horas, minutos);
        fecha.setDate(fecha.getDate() + dias);
        return fecha;
      };
      const diasHasta = (fechaDelEvento, ahora) =>
        crearCompraEn(CONFIRMADA, { evento: crearEvento({ fecha: fechaDelEvento }) }).diasRestantes(ahora);

      it("un evento de hoy a la noche, visto a la mañana, es hoy (0)", () => {
        expect(diasHasta(hoyALas(21), hoyALas(9))).toBe(0);
      });

      it("un evento de mañana a la madrugada está a 1 día aunque falten pocas horas", () => {
        expect(diasHasta(hoyALas(0, 30, 1), hoyALas(22))).toBe(1);
      });

      it("un evento de mañana a la noche, visto a la mañana, está a 1 día (no a 2)", () => {
        expect(diasHasta(hoyALas(21, 0, 1), hoyALas(9))).toBe(1);
      });

      it("un evento dentro de 30 días, a cualquier hora, está a 30", () => {
        expect(diasHasta(hoyALas(8, 0, 30), hoyALas(23, 59))).toBe(30);
      });
    });

    it("devuelve null si el evento ya pasó, aunque la compra siga CONFIRMADA", () => {
      expect(crearCompraEn(CONFIRMADA).diasRestantes(enDias(40))).toBeNull();
    });

    it.each([PENDIENTE, UTILIZADA, CANCELADA, REEMBOLSADA])("devuelve null si está %s", (estado) => {
      expect(crearCompraEn(estado).diasRestantes(AHORA)).toBeNull();
    });
  });

  describe("mensajes", () => {
    it("el comprador y el organizador conversan, en orden", () => {
      const compra = crearCompra();
      const organizador = compra.evento.organizador;

      compra.agregarMensaje(compra.comprador, "¿A qué hora abren las puertas?", AHORA);
      compra.agregarMensaje(organizador, "A las 19 h.", enDias(1));

      expect(compra.mensajes.map((m) => [m.usuario, m.mensaje])).toEqual([
        [compra.comprador, "¿A qué hora abren las puertas?"],
        [organizador, "A las 19 h."],
      ]);
    });

    it("se puede escribir en cualquier estado de la compra", () => {
      const compra = crearCompraEn(REEMBOLSADA);

      compra.agregarMensaje(compra.comprador, "Gracias por el reembolso", AHORA);

      expect(compra.mensajes).toHaveLength(1);
    });

    it("lanza ForbiddenError si escribe alguien que no participa", () => {
      const compra = crearCompra();

      expect(() => compra.agregarMensaje(crearComprador(), "Hola")).toThrow(ForbiddenError);
      expect(() => compra.agregarMensaje(crearComprador(), "Hola")).toThrow(
        "Solo el comprador y el organizador del evento pueden escribir en este chat",
      );
      expect(compra.mensajes).toHaveLength(0);
    });

    it("lanza ValidationError si el mensaje está vacío, y no lo guarda", () => {
      const compra = crearCompra();

      expect(() => compra.agregarMensaje(compra.comprador, "   ")).toThrow(ValidationError);
      expect(() => compra.agregarMensaje(compra.comprador, "   ")).toThrow(
        "El mensaje no puede estar vacío",
      );
      expect(compra.mensajes).toHaveLength(0);
    });
  });
});
