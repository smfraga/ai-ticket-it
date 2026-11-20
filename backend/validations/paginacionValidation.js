import { z } from "zod";
import { mensajesDeTipo } from "./mensajesDeTipo.js";

// Paginación de los listados, como en el TP grupal: `page` desde 1 y `limit` de 1 a 100 (por defecto, 1 y 20).
// Cada listado la extiende con sus filtros (`paginacionValidation.extend({ ... })`).
export const LIMITE_POR_DEFECTO = 20;
export const LIMITE_MAXIMO = 100;

const enteroPositivo = (parametro) =>
  z.coerce
    .number(mensajesDeTipo({ tipoInvalido: `${parametro} debe ser un número` }))
    .int(`${parametro} debe ser un número entero`)
    .positive(`${parametro} debe ser mayor a 0`);

export const paginacionValidation = z
  .object({
    page: enteroPositivo("page").max(Number.MAX_SAFE_INTEGER, "page es demasiado grande").default(1),
    limit: enteroPositivo("limit")
      .max(LIMITE_MAXIMO, `limit no puede ser mayor a ${LIMITE_MAXIMO}`)
      .default(LIMITE_POR_DEFECTO),
  })
  .strict();
