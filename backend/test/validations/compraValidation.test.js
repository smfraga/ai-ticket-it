import { describe, expect, it } from "@jest/globals";
import { comprarValidation } from "../../validations/compraValidation.js";

const TIPO_ID = "3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a13";

const mensajes = (resultado) => resultado.error.issues.map((issue) => issue.message);

describe("comprarValidation", () => {
  it("acepta un tipo de entrada y una cantidad válidos", () => {
    expect(comprarValidation.parse({ tipoEntradaId: TIPO_ID, cantidad: 2 })).toEqual({
      tipoEntradaId: TIPO_ID,
      cantidad: 2,
    });
  });

  it("rechaza un tipoEntradaId que no es UUID", () => {
    const resultado = comprarValidation.safeParse({ tipoEntradaId: "abc", cantidad: 1 });

    expect(resultado.success).toBe(false);
  });

  it("exige el tipoEntradaId", () => {
    expect(comprarValidation.safeParse({ cantidad: 1 }).success).toBe(false);
  });

  it("exige la cantidad", () => {
    const resultado = comprarValidation.safeParse({ tipoEntradaId: TIPO_ID });

    expect(mensajes(resultado)).toContain("La cantidad es obligatoria");
  });

  it("rechaza una cantidad en texto", () => {
    const resultado = comprarValidation.safeParse({ tipoEntradaId: TIPO_ID, cantidad: "2" });

    expect(mensajes(resultado)).toContain("La cantidad debe ser un número");
  });

  it("rechaza una cantidad decimal", () => {
    const resultado = comprarValidation.safeParse({ tipoEntradaId: TIPO_ID, cantidad: 1.5 });

    expect(mensajes(resultado)).toContain("La cantidad debe ser un número entero");
  });

  it.each([0, -3])("rechaza una cantidad no positiva (%s)", (cantidad) => {
    const resultado = comprarValidation.safeParse({ tipoEntradaId: TIPO_ID, cantidad });

    expect(mensajes(resultado)).toContain("La cantidad debe ser mayor a 0");
  });

  it("rechaza campos de más", () => {
    const resultado = comprarValidation.safeParse({ tipoEntradaId: TIPO_ID, cantidad: 1, total: 0 });

    expect(resultado.success).toBe(false);
  });
});
