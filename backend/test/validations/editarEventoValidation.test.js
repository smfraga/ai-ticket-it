import { describe, expect, it } from "@jest/globals";
import { editarEventoValidation } from "../../validations/eventoValidation.js";

const TIPO_ID = "3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a13";

describe("editarEventoValidation", () => {
  it("acepta un solo campo y convierte la fecha en Date", () => {
    const resultado = editarEventoValidation.parse({ fecha: "2026-12-20T21:00:00Z" });

    expect(resultado).toEqual({ fecha: new Date("2026-12-20T21:00:00Z") });
  });

  it("acepta tipos existentes (con id) y nuevos (sin id)", () => {
    const resultado = editarEventoValidation.parse({
      tiposEntrada: [
        { id: TIPO_ID, nombre: "General", precio: 1000, cupo: 10 },
        { nombre: "VIP", precio: 5000, cupo: 5 },
      ],
    });

    expect(resultado.tiposEntrada[0].id).toBe(TIPO_ID);
    expect(resultado.tiposEntrada[1].id).toBeUndefined();
  });

  it("rechaza un body vacío", () => {
    const resultado = editarEventoValidation.safeParse({});

    expect(resultado.success).toBe(false);
    expect(resultado.error.issues[0].message).toBe("No hay nada para editar");
  });

  it("rechaza campos de más, un id de tipo inválido y una lista de tipos vacía", () => {
    expect(editarEventoValidation.safeParse({ organizadorId: TIPO_ID }).success).toBe(false);
    expect(
      editarEventoValidation.safeParse({ tiposEntrada: [{ id: "x", nombre: "G", precio: 1, cupo: 1 }] }).success,
    ).toBe(false);
    expect(editarEventoValidation.safeParse({ tiposEntrada: [] }).success).toBe(false);
  });

  it("rechaza un nombre vacío y una fecha sin formato ISO", () => {
    expect(editarEventoValidation.safeParse({ nombre: "  " }).success).toBe(false);
    expect(editarEventoValidation.safeParse({ fecha: "20/12/2026" }).success).toBe(false);
  });
});
