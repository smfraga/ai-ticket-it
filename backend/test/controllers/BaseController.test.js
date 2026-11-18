import { describe, expect, it } from "@jest/globals";
import { z } from "zod";
import { BaseController } from "../../controllers/BaseController.js";
import { ValidationError } from "../../errors/AppError.js";

const ID_VALIDO = "3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a13";

describe("BaseController", () => {
  const controller = new BaseController();

  describe("parsearId", () => {
    it("devuelve el id si es un UUID válido", () => {
      expect(controller.parsearId(ID_VALIDO)).toBe(ID_VALIDO);
    });

    it.each([undefined, null, "", "123", "no-es-un-uuid", `${ID_VALIDO}x`, 42])(
      "lanza ValidationError si el id es %p",
      (id) => {
        expect(() => controller.parsearId(id)).toThrow(ValidationError);
        expect(() => controller.parsearId(id)).toThrow("El parámetro id debe ser un UUID válido");
      },
    );
  });

  describe("extraerYValidarQuery", () => {
    const schema = z
      .object({
        texto: z.string().trim().optional(),
        limite: z.coerce.number().int().min(1).default(10),
      })
      .strict();

    it("devuelve la query ya transformada, con los valores por defecto", () => {
      expect(controller.extraerYValidarQuery({ texto: "  rock " }, schema)).toEqual({
        texto: "rock",
        limite: 10,
      });
    });

    it("convierte los textos de la query a números cuando el esquema lo pide", () => {
      expect(controller.extraerYValidarQuery({ limite: "5" }, schema).limite).toBe(5);
    });

    it("lanza ValidationError con el detalle si la query es inválida", () => {
      const error = (() => {
        try {
          controller.extraerYValidarQuery({ limite: "0" }, schema);
        } catch (e) {
          return e;
        }
      })();

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Los parámetros de la query son inválidos");
      expect(error.details).toEqual(expect.arrayContaining([expect.objectContaining({ path: ["limite"] })]));
    });

    it("lanza ValidationError si la query trae un parámetro que el esquema no conoce", () => {
      expect(() => controller.extraerYValidarQuery({ otro: "x" }, schema)).toThrow(ValidationError);
    });
  });
});
