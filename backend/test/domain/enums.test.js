import { describe, expect, it } from "@jest/globals";
import { estadoCompra, transicionesCompra } from "../../domain/EstadoCompra.js";
import { rolUsuario } from "../../domain/RolUsuario.js";

describe("enums de dominio", () => {
  it.each([
    ["estadoCompra", estadoCompra],
    ["rolUsuario", rolUsuario],
    ["transicionesCompra", transicionesCompra],
  ])("%s está congelado (Object.freeze)", (_nombre, enumObj) => {
    expect(Object.isFrozen(enumObj)).toBe(true);
  });

  it("estadoCompra expone los cinco estados del diagrama", () => {
    expect(estadoCompra).toEqual({
      PENDIENTE: "PENDIENTE",
      CONFIRMADA: "CONFIRMADA",
      UTILIZADA: "UTILIZADA",
      CANCELADA: "CANCELADA",
      REEMBOLSADA: "REEMBOLSADA",
    });
  });

  it("rolUsuario expone COMPRADOR y ORGANIZADOR", () => {
    expect(rolUsuario).toEqual({ COMPRADOR: "COMPRADOR", ORGANIZADOR: "ORGANIZADOR" });
  });

  it("transicionesCompra tiene una entrada por cada estado", () => {
    expect(Object.keys(transicionesCompra).sort()).toEqual(Object.values(estadoCompra).sort());
  });

  it("las transiciones de un estado no se pueden modificar", () => {
    expect(() => transicionesCompra[estadoCompra.UTILIZADA].push(estadoCompra.CANCELADA)).toThrow(
      TypeError,
    );
    expect(transicionesCompra[estadoCompra.UTILIZADA]).toEqual([]);
  });

  it("intentar modificar un enum congelado no tiene efecto", () => {
    expect(() => {
      estadoCompra.PENDIENTE = "OTRO";
    }).toThrow(TypeError);
    expect(estadoCompra.PENDIENTE).toBe("PENDIENTE");
  });
});
