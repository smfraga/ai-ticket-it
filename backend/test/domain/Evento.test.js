import { describe, expect, it } from "@jest/globals";
import { Evento } from "../../domain/Evento.js";
import { rolUsuario } from "../../domain/RolUsuario.js";
import { ForbiddenError, ValidationError } from "../../errors/AppError.js";
import {
  AHORA,
  crearCategoria,
  crearEvento,
  crearOrganizador,
  crearTipoEntrada,
  crearUsuario,
  enDias,
} from "../helpers/domainFactories.js";

function eventoCon(cambios = {}) {
  const datos = {
    nombre: "Recital",
    descripcion: "Un recital",
    categoria: crearCategoria(),
    fecha: enDias(10),
    organizador: crearOrganizador(),
    tiposEntrada: [crearTipoEntrada()],
    multimedia: undefined,
    ...cambios,
  };
  return new Evento(
    datos.nombre,
    datos.descripcion,
    datos.categoria,
    datos.fecha,
    datos.organizador,
    datos.tiposEntrada,
    datos.multimedia,
  );
}

describe("Evento", () => {
  it("se construye con sus datos y sin multimedia por defecto", () => {
    const evento = eventoCon();

    expect(evento.nombre).toBe("Recital");
    expect(evento.tiposEntrada).toHaveLength(1);
    expect(evento.multimedia).toEqual([]);
  });

  it("acepta un organizador que también es comprador", () => {
    const organizador = crearUsuario({ roles: [rolUsuario.COMPRADOR, rolUsuario.ORGANIZADOR] });

    expect(eventoCon({ organizador }).organizador).toBe(organizador);
  });

  it("acepta una fecha pasada (para eventos ya realizados)", () => {
    expect(eventoCon({ fecha: enDias(-5) }).yaPaso(AHORA)).toBe(true);
  });

  it.each([
    ["sin nombre", { nombre: " " }, "El evento debe tener un nombre"],
    ["sin categoría", { categoria: undefined }, "El evento debe tener una categoría"],
    ["con fecha inválida", { fecha: new Date("no es fecha") }, "La fecha del evento debe ser una fecha válida"],
    ["con fecha que no es Date", { fecha: "2026-12-01" }, "La fecha del evento debe ser una fecha válida"],
    ["sin organizador", { organizador: null }, "El evento debe tener un organizador"],
    ["sin tipos de entrada", { tiposEntrada: [] }, "El evento debe tener al menos un tipo de entrada"],
    [
      "con tipos de entrada que no son TipoEntrada",
      { tiposEntrada: [{ nombre: "General" }] },
      "Los tipos de entrada del evento no son válidos",
    ],
    [
      "con dos tipos de entrada del mismo nombre",
      { tiposEntrada: [crearTipoEntrada({ nombre: "VIP" }), crearTipoEntrada({ nombre: "vip" })] },
      "El evento no puede tener dos tipos de entrada con el mismo nombre",
    ],
    ["con multimedia vacía", { multimedia: [""] }, "La multimedia del evento debe ser una lista de URLs"],
  ])("lanza ValidationError %s", (_, cambios, mensaje) => {
    expect(() => eventoCon(cambios)).toThrow(ValidationError);
    expect(() => eventoCon(cambios)).toThrow(mensaje);
  });

  it("lanza ForbiddenError si el organizador no tiene rol ORGANIZADOR", () => {
    const organizador = crearUsuario({ roles: [rolUsuario.COMPRADOR] });

    expect(() => eventoCon({ organizador })).toThrow(ForbiddenError);
    expect(() => eventoCon({ organizador })).toThrow(
      "Solo un usuario organizador puede crear eventos",
    );
  });

  describe("tuPrecioEstaEntre (General $10000, VIP $25000)", () => {
    it.each([
      [10000, 10000, true],
      [0, 10000, true],
      [25000, 30000, true],
      [5000, 30000, true],
      [0, 9999, false],
      [10001, 24999, false],
      [25001, 50000, false],
    ])("entre %d y %d devuelve %s", (min, max, esperado) => {
      expect(crearEvento().tuPrecioEstaEntre(min, max)).toBe(esperado);
    });

    it.each([
      ["el mínimo es mayor que el máximo", 20000, 10000],
      ["el mínimo no es número", "0", 10000],
      ["el máximo no es número", 0, undefined],
    ])("lanza ValidationError si %s", (_, min, max) => {
      expect(() => crearEvento().tuPrecioEstaEntre(min, max)).toThrow(
        "El rango de precios no es válido",
      );
    });
  });

  it("precioMinimo devuelve el precio del tipo de entrada más barato", () => {
    expect(crearEvento().precioMinimo()).toBe(10000);
  });

  describe("yaPaso", () => {
    it("es falso antes del evento", () => {
      expect(crearEvento({ fecha: enDias(1) }).yaPaso(AHORA)).toBe(false);
    });

    it("es verdadero en el momento exacto del evento y después", () => {
      const evento = crearEvento({ fecha: enDias(1) });

      expect(evento.yaPaso(enDias(1))).toBe(true);
      expect(evento.yaPaso(enDias(2))).toBe(true);
    });
  });

  describe("esOrganizador", () => {
    it("reconoce al organizador aunque sea otra instancia con el mismo id", () => {
      const evento = crearEvento();
      evento.organizador.id = "u-1";
      const mismoOrganizador = crearOrganizador();
      mismoOrganizador.id = "u-1";

      expect(evento.esOrganizador(mismoOrganizador)).toBe(true);
    });

    it("es falso para otro usuario o para null", () => {
      const evento = crearEvento();

      expect(evento.esOrganizador(crearOrganizador())).toBe(false);
      expect(evento.esOrganizador(null)).toBe(false);
    });
  });

  it("tieneTipoEntrada reconoce solo sus propios tipos", () => {
    const evento = crearEvento();

    expect(evento.tieneTipoEntrada(evento.tiposEntrada[1])).toBe(true);
    expect(evento.tieneTipoEntrada(crearTipoEntrada())).toBe(false);
  });
});
