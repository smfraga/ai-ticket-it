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
