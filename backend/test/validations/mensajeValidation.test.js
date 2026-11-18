import { describe, expect, it } from "@jest/globals";
import { LARGO_MAXIMO_MENSAJE, enviarMensajeValidation } from "../../validations/mensajeValidation.js";

const mensajes = (resultado) => resultado.error.issues.map((issue) => issue.message);

describe("enviarMensajeValidation", () => {
  it("acepta un mensaje y le recorta los espacios de los bordes", () => {
    expect(enviarMensajeValidation.parse({ mensaje: "  Hola, ¿a qué hora abren?  " })).toEqual({
      mensaje: "Hola, ¿a qué hora abren?",
    });
  });

  it("acepta un mensaje de exactamente el largo máximo", () => {
    const resultado = enviarMensajeValidation.safeParse({ mensaje: "a".repeat(LARGO_MAXIMO_MENSAJE) });

    expect(resultado.success).toBe(true);
  });

  it("rechaza un mensaje que supera el largo máximo", () => {
    const resultado = enviarMensajeValidation.safeParse({ mensaje: "a".repeat(LARGO_MAXIMO_MENSAJE + 1) });

    expect(mensajes(resultado)).toContain("El mensaje no puede superar los 500 caracteres");
  });

  it("el largo máximo se mide después de recortar los espacios", () => {
    const resultado = enviarMensajeValidation.safeParse({
      mensaje: `  ${"a".repeat(LARGO_MAXIMO_MENSAJE)}  `,
    });

    expect(resultado.success).toBe(true);
  });

  it.each(["", "   ", "\n\t"])("rechaza un mensaje vacío o solo con espacios (%j)", (mensaje) => {
    const resultado = enviarMensajeValidation.safeParse({ mensaje });

    expect(mensajes(resultado)).toContain("El mensaje no puede estar vacío");
  });

  it("exige el mensaje", () => {
    const resultado = enviarMensajeValidation.safeParse({});

    expect(mensajes(resultado)).toContain("El mensaje es obligatorio");
  });

  it.each([42, null, ["hola"]])("rechaza un mensaje que no es un texto (%j)", (mensaje) => {
    const resultado = enviarMensajeValidation.safeParse({ mensaje });

    expect(resultado.success).toBe(false);
  });

  it("rechaza campos de más", () => {
    const resultado = enviarMensajeValidation.safeParse({ mensaje: "Hola", autor: "otro" });

    expect(resultado.success).toBe(false);
  });
});
