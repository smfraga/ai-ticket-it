import { z } from "zod";
import { idValidation } from "./idValidation.js";
import { mensajesDeTipo } from "./mensajesDeTipo.js";
import { paginacionValidation } from "./paginacionValidation.js";

export const PERIODOS = ["proximos", "pasados", "todos"];
export const ORDENES = ["fecha", "precio", "puntaje"];
export const DIRECCIONES = ["asc", "desc"];

const tipoEntradaValidation = z
  .object({
    nombre: z.string().trim().min(1, "El nombre del tipo de entrada es obligatorio"),
    descripcion: z.string().trim().optional(),
    precio: z
      .number(mensajesDeTipo({ tipoInvalido: "El precio debe ser un número" }))
      .min(0, "El precio no puede ser negativo"),
    cupo: z
      .number(mensajesDeTipo({ tipoInvalido: "El cupo debe ser un número" }))
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
    tiposEntrada: z.array(tipoEntradaValidation).min(1, "El evento debe tener al menos un tipo de entrada"),
    multimedia: z.array(z.string().trim().url("Cada elemento de multimedia debe ser una URL")).default([]),
  })
  .strict();

// Al editar, `multimedia` es la lista completa de lo que se conserva: URLs o rutas de imágenes adjuntas
// ("/eventos/{id}/imagenes/{imagenId}"). Que la ruta sea de una imagen de este evento lo controla el dominio.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RUTA_DE_IMAGEN = new RegExp(`^/eventos/${UUID}/imagenes/${UUID}$`, "i");
const imagenConservada = z
  .string()
  .trim()
  .refine((valor) => RUTA_DE_IMAGEN.test(valor) || z.string().url().safeParse(valor).success, {
    message: "Cada elemento de multimedia debe ser una URL o la ruta de una imagen del evento",
  });

// Todo opcional: se cambia solo lo que viene. `tiposEntrada`, si viene, es la lista completa (con `id` los que
// ya existían, sin `id` los nuevos).
export const editarEventoValidation = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio"),
    descripcion: z.string().trim(),
    categoriaId: idValidation,
    fecha: z
      .string()
      .datetime({ offset: true, message: "La fecha debe tener formato ISO, por ejemplo 2026-12-20T21:00:00Z" })
      .transform((fecha) => new Date(fecha)),
    tiposEntrada: z
      .array(tipoEntradaValidation.extend({ id: idValidation.optional() }))
      .min(1, "El evento debe tener al menos un tipo de entrada"),
    multimedia: z.array(imagenConservada),
  })
  .partial()
  .strict()
  .refine((datos) => Object.keys(datos).length > 0, { message: "No hay nada para editar" });

// Una imagen adjunta, como data URL de un JPEG o PNG en base64. El tope real (400 KB de imagen) lo controla el
// dominio sobre los bytes; este largo (unos 420 KB en base64) solo corta antes algo claramente desmedido.
const FORMATO_DE_IMAGEN = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/;

export const imagenEventoValidation = z
  .object({
    imagen: z
      .string(mensajesDeTipo({ obligatorio: "Falta la imagen" }))
      .max(560000, "La imagen es demasiado grande")
      .regex(FORMATO_DE_IMAGEN, "La imagen tiene que ser un JPEG o un PNG en base64"),
  })
  .strict();

// Los parámetros de la query llegan como texto: "" se trata como "no enviado" y los números se convierten.
const precioDeQuery = z.preprocess(
  (valor) => (valor === "" ? undefined : valor),
  z.coerce
    .number(mensajesDeTipo({ tipoInvalido: "Debe ser un número" }))
    .min(0, "No puede ser negativo")
    .optional(),
);

const opcionDe = (valores) => z.enum(valores, { error: `Tiene que ser ${valores.join(", ")}` });

// Los filtros del catálogo más `page` y `limit` (paginación, como los listados del TP grupal).
export const filtrosEventosValidation = paginacionValidation
  .extend({
    texto: z
      .string()
      .trim()
      .max(100, "El texto buscado no puede superar los 100 caracteres")
      .optional()
      .transform((texto) => texto || undefined),
    categoriaId: idValidation.optional(),
    organizadorId: idValidation.optional(),
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
