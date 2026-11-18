import { z } from "zod";
import { idValidation } from "./idValidation.js";

export const PERIODOS = ["proximos", "pasados", "todos"];
export const ORDENES = ["fecha", "precio", "puntaje"];
export const DIRECCIONES = ["asc", "desc"];

const tipoEntradaValidation = z
  .object({
    nombre: z.string().trim().min(1, "El nombre del tipo de entrada es obligatorio"),
    descripcion: z.string().trim().optional(),
    precio: z
      .number({ invalid_type_error: "El precio debe ser un número" })
      .min(0, "El precio no puede ser negativo"),
    cupo: z
      .number({ invalid_type_error: "El cupo debe ser un número" })
      .int("El cupo debe ser un número entero")
      .positive("El cupo debe ser mayor a 0"),
  })
  .strict();

export const crearEventoValidation = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio"),
    descripcion: z.string().trim().optional(),
    categoriaId: idValidation,
    fecha: z
      .string()
      .datetime({ offset: true, message: "La fecha debe tener formato ISO, por ejemplo 2026-12-20T21:00:00Z" })
      .transform((fecha) => new Date(fecha)),
    tiposEntrada: z
      .array(tipoEntradaValidation)
      .min(1, "El evento debe tener al menos un tipo de entrada"),
    multimedia: z.array(z.string().trim().url("Cada elemento de multimedia debe ser una URL")).default([]),
  })
  .strict();

// Los parámetros de la query llegan como texto: "" se trata como "no enviado" y los números se convierten.
const precioDeQuery = z.preprocess(
  (valor) => (valor === "" ? undefined : valor),
  z.coerce.number({ invalid_type_error: "Debe ser un número" }).min(0, "No puede ser negativo").optional(),
);

const opcionDe = (valores) =>
  z.enum(valores, { errorMap: () => ({ message: `Tiene que ser ${valores.join(", ")}` }) });

export const filtrosEventosValidation = z
  .object({
    texto: z
      .string()
      .trim()
      .max(100, "El texto buscado no puede superar los 100 caracteres")
      .optional()
      .transform((texto) => texto || undefined),
    categoriaId: idValidation.optional(),
    precioMin: precioDeQuery,
    precioMax: precioDeQuery,
    periodo: opcionDe(PERIODOS).default("proximos"),
    orden: opcionDe(ORDENES).default("fecha"),
    direccion: opcionDe(DIRECCIONES).optional(),
  })
  .strict()
  .refine(({ precioMin, precioMax }) => precioMin === undefined || precioMax === undefined || precioMin <= precioMax, {
    message: "precioMin no puede ser mayor que precioMax",
    path: ["precioMax"],
  });
