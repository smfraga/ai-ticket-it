import { z } from "zod";
import { PUNTUACION_MAXIMA, PUNTUACION_MINIMA } from "../domain/Resenia.js";
import { mensajesDeTipo } from "./mensajesDeTipo.js";

export const crearReseniaValidation = z
  .object({
    puntuacion: z
      .number(
        mensajesDeTipo({
          obligatorio: "La puntuación es obligatoria",
          tipoInvalido: "La puntuación debe ser un número",
        }),
      )
      .int("La puntuación debe ser un número entero")
      .min(PUNTUACION_MINIMA, `La puntuación debe ser como mínimo ${PUNTUACION_MINIMA}`)
      .max(PUNTUACION_MAXIMA, `La puntuación debe ser como máximo ${PUNTUACION_MAXIMA}`),
    // Sin límite de largo: solo se exige que haya un comentario.
    detalle: z
      .string(
        mensajesDeTipo({
          obligatorio: "El comentario es obligatorio",
          tipoInvalido: "El comentario debe ser un texto",
        }),
      )
      .trim()
      .min(1, "El comentario no puede estar vacío"),
  })
  .strict();
