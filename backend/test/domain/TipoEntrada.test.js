import { describe, expect, it } from "@jest/globals";
import { TipoEntrada } from "../../domain/TipoEntrada.js";
import { ConflictError, ValidationError } from "../../errors/AppError.js";
import { crearTipoEntrada } from "../helpers/domainFactories.js";

function tipoCon(cambios = {}) {
  const datos = { nombre: "General", descripcion: "Campo", precio: 1000, cupo: 10, ...cambios };
  return new TipoEntrada(datos.nombre, datos.descripcion, datos.precio, datos.cupo);
}

describe("TipoEntrada", () => {
  it("se construye sin entradas vendidas y con todo el cupo disponible", () => {
    const tipo = tipoCon({ cupo: 50 });

    expect(tipo.nombre).toBe("General");
    expect(tipo.precio).toBe(1000);
    expect(tipo.vendidas).toBe(0);
    expect(tipo.disponibles()).toBe(50);
  });

  it("acepta entradas gratuitas", () => {
    expect(tipoCon({ precio: 0 }).precio).toBe(0);
  });

  it.each([
    ["sin nombre", { nombre: "" }, "El tipo de entrada debe tener un nombre"],
    ["con precio negativo", { precio: -1 }, "El precio del tipo de entrada debe ser un número mayor o igual a 0"],
    ["con precio que no es número", { precio: "1000" }, "El precio del tipo de entrada debe ser un número mayor o igual a 0"],
    ["con cupo 0", { cupo: 0 }, "El cupo del tipo de entrada debe ser un número entero positivo"],
    ["con cupo decimal", { cupo: 1.5 }, "El cupo del tipo de entrada debe ser un número entero positivo"],
  ])("lanza ValidationError %s", (_, cambios, mensaje) => {
    expect(() => tipoCon(cambios)).toThrow(ValidationError);
    expect(() => tipoCon(cambios)).toThrow(mensaje);
  });

  describe("hayCupoPara", () => {
    it.each([
      ["justo el cupo disponible", 10, true],
      ["menos que el cupo", 3, true],
      ["uno más que el cupo", 11, false],
      ["cero", 0, false],
      ["un número negativo", -2, false],
      ["un decimal", 1.5, false],
    ])("con %s devuelve %s", (_, cantidad, esperado) => {
      expect(crearTipoEntrada({ cupo: 10 }).hayCupoPara(cantidad)).toBe(esperado);
    });

    it("tiene en cuenta las entradas ya vendidas", () => {
      const tipo = crearTipoEntrada({ cupo: 10 });
      tipo.reservar(8);

      expect(tipo.hayCupoPara(2)).toBe(true);
      expect(tipo.hayCupoPara(3)).toBe(false);
    });
  });

  describe("reservar", () => {
    it("suma las entradas vendidas y descuenta las disponibles", () => {
      const tipo = crearTipoEntrada({ cupo: 10 });

      tipo.reservar(4);

      expect(tipo.vendidas).toBe(4);
      expect(tipo.disponibles()).toBe(6);
    });

    it("lanza ConflictError si no hay cupo, y no vende nada", () => {
      const tipo = crearTipoEntrada({ nombre: "Platea", cupo: 10 });
      tipo.reservar(9);

      expect(() => tipo.reservar(2)).toThrow(ConflictError);
      expect(() => tipo.reservar(2)).toThrow("No hay cupo suficiente para Platea: quedan 1 entradas");
      expect(tipo.vendidas).toBe(9);
    });

    it("lanza ValidationError con una cantidad inválida", () => {
      expect(() => crearTipoEntrada().reservar(0)).toThrow(
        "La cantidad debe ser un número entero positivo",
      );
    });
  });

  describe("liberar", () => {
    it("devuelve entradas al cupo", () => {
      const tipo = crearTipoEntrada({ cupo: 10 });
      tipo.reservar(5);

      tipo.liberar(2);

      expect(tipo.disponibles()).toBe(7);
    });

    it("lanza ConflictError si se quieren liberar más de las vendidas", () => {
      const tipo = crearTipoEntrada({ cupo: 10 });
      tipo.reservar(1);

      expect(() => tipo.liberar(2)).toThrow(ConflictError);
      expect(() => tipo.liberar(2)).toThrow("No se pueden liberar más entradas de las vendidas");
      expect(tipo.vendidas).toBe(1);
    });
  });
});
