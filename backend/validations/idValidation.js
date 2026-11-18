import { z } from "zod";

export const idValidation = z.string().uuid("Debe ser un UUID válido");
