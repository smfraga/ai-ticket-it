import { z } from "zod";
import { idValidation } from "./idValidation.js";
import { mensajesDeTipo } from "./mensajesDeTipo.js";

export const comprarValidation = z
  .object({
    tipoEntradaId: idValidation,
    cantidad: z
      .number(
        mensajesDeTipo({ obligatorio: "La cantidad es obligatoria", tipoInvalido: "La cantidad debe ser un número" }),
      )
      .int("La cantidad debe ser un número entero")
      .positive("La cantidad debe ser mayor a 0"),
  })
  .strict();
