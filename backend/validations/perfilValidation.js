import { z } from "zod";

// Nombre y apellido, cada uno opcional, pero al menos uno. El dominio vuelve a validar que no queden vacíos.
export const editarPerfilValidation = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre no puede quedar vacío")
      .max(60, "El nombre es demasiado largo")
      .optional(),
    apellido: z
      .string()
      .trim()
      .min(1, "El apellido no puede quedar vacío")
      .max(60, "El apellido es demasiado largo")
      .optional(),
  })
  .strict()
  .refine((datos) => datos.nombre !== undefined || datos.apellido !== undefined, {
    message: "Hay que indicar el nombre o el apellido a cambiar",
  });

// La foto como data URL de un JPEG o PNG en base64. El tope (unos 64 KB de imagen) lo controla el dominio sobre los
// bytes; este largo solo corta antes algo claramente desmedido.
const FORMATO_DE_IMAGEN = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/;

export const fotoValidation = z
  .object({
    imagen: z
      .string({ required_error: "Falta la imagen" })
      .max(90000, "La foto es demasiado grande")
      .regex(FORMATO_DE_IMAGEN, "La foto tiene que ser una imagen JPEG o PNG en base64"),
  })
  .strict();
