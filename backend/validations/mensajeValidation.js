import { z } from "zod";

export const LARGO_MAXIMO_MENSAJE = 500;

export const enviarMensajeValidation = z
  .object({
    mensaje: z
      .string({
        required_error: "El mensaje es obligatorio",
        invalid_type_error: "El mensaje debe ser un texto",
      })
      .trim()
      .min(1, "El mensaje no puede estar vacío")
      .max(LARGO_MAXIMO_MENSAJE, `El mensaje no puede superar los ${LARGO_MAXIMO_MENSAJE} caracteres`),
  })
  .strict();
