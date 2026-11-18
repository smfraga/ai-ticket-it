import { describe, expect, it } from "@jest/globals";
import { crearReseniaValidation } from "../../validations/reseniaValidation.js";

const mensajes = (resultado) => resultado.error.issues.map((issue) => issue.message);

describe("crearReseniaValidation", () => {
  it("acepta una puntuación y un comentario válidos, y recorta el comentario", () => {
    expect(crearReseniaValidation.parse({ puntuacion: 4, detalle: "  Muy buen show  " })).toEqual({
      puntuacion: 4,
      detalle: "Muy buen show",
    });
  });

  it.each([1, 2, 3, 4, 5])("acepta la puntuación %s", (puntuacion) => {
    expect(crearReseniaValidation.safeParse({ puntuacion, detalle: "Bien" }).success).toBe(true);
  });

  it.each([0, -1, 6, 100])("rechaza la puntuación %s, fuera de 1 a 5", (puntuacion) => {
    const resultado = crearReseniaValidation.safeParse({ puntuacion, detalle: "Bien" });

    expect(resultado.success).toBe(false);
    expect(mensajes(resultado).join(" ")).toMatch(/como (mínimo|máximo)/);
  });

  it("rechaza una puntuación decimal", () => {
    const resultado = crearReseniaValidation.safeParse({ puntuacion: 3.5, detalle: "Bien" });

    expect(mensajes(resultado)).toContain("La puntuación debe ser un número entero");
  });

  it("rechaza una puntuación en texto", () => {
    const resultado = crearReseniaValidation.safeParse({ puntuacion: "4", detalle: "Bien" });

    expect(mensajes(resultado)).toContain("La puntuación debe ser un número");
  });

  it("exige la puntuación", () => {
    const resultado = crearReseniaValidation.safeParse({ detalle: "Bien" });

    expect(mensajes(resultado)).toContain("La puntuación es obligatoria");
  });

  it.each(["", "   ", "\n\t"])("rechaza un comentario vacío o solo con espacios (%j)", (detalle) => {
    const resultado = crearReseniaValidation.safeParse({ puntuacion: 4, detalle });

    expect(mensajes(resultado)).toContain("El comentario no puede estar vacío");
  });

  it("exige el comentario", () => {
    const resultado = crearReseniaValidation.safeParse({ puntuacion: 4 });

    expect(mensajes(resultado)).toContain("El comentario es obligatorio");
  });

  it("rechaza un comentario que no es un texto", () => {
    expect(crearReseniaValidation.safeParse({ puntuacion: 4, detalle: 42 }).success).toBe(false);
  });

  it("acepta un comentario muy largo: no tiene límite", () => {
    const resultado = crearReseniaValidation.safeParse({ puntuacion: 5, detalle: "a".repeat(5000) });

    expect(resultado.success).toBe(true);
  });

  it("rechaza campos de más", () => {
    const resultado = crearReseniaValidation.safeParse({ puntuacion: 4, detalle: "Bien", autor: "otro" });

    expect(resultado.success).toBe(false);
  });
});
