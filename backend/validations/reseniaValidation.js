import { z } from "zod";
import { PUNTUACION_MAXIMA, PUNTUACION_MINIMA } from "../domain/Resenia.js";

export const crearReseniaValidation = z
  .object({
    puntuacion: z
      .number({
        required_error: "La puntuación es obligatoria",
        invalid_type_error: "La puntuación debe ser un número",
      })
      .int("La puntuación debe ser un número entero")
      .min(PUNTUACION_MINIMA, `La puntuación debe ser como mínimo ${PUNTUACION_MINIMA}`)
      .max(PUNTUACION_MAXIMA, `La puntuación debe ser como máximo ${PUNTUACION_MAXIMA}`),
    // Sin límite de largo: solo se exige que haya un comentario.
    detalle: z
      .string({
        required_error: "El comentario es obligatorio",
        invalid_type_error: "El comentario debe ser un texto",
      })
      .trim()
      .min(1, "El comentario no puede estar vacío"),
  })
  .strict();
