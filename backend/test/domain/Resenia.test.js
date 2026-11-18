import { describe, expect, it } from "@jest/globals";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import { Resenia } from "../../domain/Resenia.js";
import { ConflictError, ForbiddenError, ValidationError } from "../../errors/AppError.js";
import { AHORA, crearComprador, crearCompraEn } from "../helpers/domainFactories.js";

const { PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA } = estadoCompra;

function reseniaCon(compra, cambios = {}) {
  const datos = {
    autor: compra.comprador,
    puntuacion: 4,
    detalle: "Muy buen show",
    fecha: AHORA,
    ...cambios,
  };
  return new Resenia(compra, datos.autor, datos.puntuacion, datos.detalle, datos.fecha);
}

describe("Resenia", () => {
  it("se construye sobre una compra UTILIZADA y toma comprador y evento de la compra", () => {
    const compra = crearCompraEn(UTILIZADA);

    const resenia = reseniaCon(compra);

    expect(resenia.compra).toBe(compra);
    expect(resenia.comprador).toBe(compra.comprador);
    expect(resenia.evento).toBe(compra.evento);
    expect(resenia.puntuacion).toBe(4);
    expect(resenia.detalle).toBe("Muy buen show");
    expect(resenia.fecha).toBe(AHORA);
  });

  it.each([1, 5])("acepta la puntuación límite %d", (puntuacion) => {
    expect(reseniaCon(crearCompraEn(UTILIZADA), { puntuacion }).puntuacion).toBe(puntuacion);
  });

  it("lanza ValidationError si falta la compra", () => {
    expect(() => new Resenia(null, crearComprador(), 4, "Bueno")).toThrow(
      "La reseña debe ser de una compra",
    );
  });

  it.each([PENDIENTE, CONFIRMADA, CANCELADA, REEMBOLSADA])(
    "lanza ConflictError si la compra está %s",
    (estado) => {
      const compra = crearCompraEn(estado);

      expect(() => reseniaCon(compra)).toThrow(ConflictError);
      expect(() => reseniaCon(compra)).toThrow("Solo se puede reseñar una compra utilizada");
    },
  );

  it.each([0, 6, 3.5, "5", null])("lanza ValidationError si la puntuación es %p", (puntuacion) => {
    const compra = crearCompraEn(UTILIZADA);

    expect(() => reseniaCon(compra, { puntuacion })).toThrow(ValidationError);
    expect(() => reseniaCon(compra, { puntuacion })).toThrow(
      "La puntuación debe ser un número entero entre 1 y 5",
    );
  });

  it.each([null, "", "   "])("lanza ValidationError si el comentario es %p", (detalle) => {
    expect(() => reseniaCon(crearCompraEn(UTILIZADA), { detalle })).toThrow(
      "La reseña debe tener un comentario",
    );
  });

  it("lanza ForbiddenError si la escribe alguien que no es el comprador", () => {
    const compra = crearCompraEn(UTILIZADA);

    expect(() => reseniaCon(compra, { autor: compra.evento.organizador })).toThrow(ForbiddenError);
    expect(() => reseniaCon(compra, { autor: crearComprador() })).toThrow(
      "Solo el comprador puede reseñar su compra",
    );
  });
});
