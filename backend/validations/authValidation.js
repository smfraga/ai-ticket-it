import { z } from "zod";
import { rolUsuario } from "../domain/RolUsuario.js";

const BYTES_MAXIMOS_BCRYPT = 72;

const emailValidation = z.string().trim().toLowerCase().email("El email no es válido");

const passwordValidation = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= BYTES_MAXIMOS_BCRYPT,
    `La contraseña no puede superar los ${BYTES_MAXIMOS_BCRYPT} bytes`,
  );

const rolesValidation = z
  .array(z.nativeEnum(rolUsuario), { required_error: "Los roles son obligatorios" })
  .min(1, "El usuario debe tener al menos un rol")
  .refine((roles) => new Set(roles).size === roles.length, "El usuario no puede tener roles repetidos");

export const registroValidation = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio"),
    apellido: z.string().trim().min(1, "El apellido es obligatorio"),
    email: emailValidation,
    password: passwordValidation,
    roles: rolesValidation,
  })
  .strict();

export const loginValidation = z
  .object({
    email: z.string().trim().toLowerCase().min(1, "El email es obligatorio"),
    password: z.string().min(1, "La contraseña es obligatoria"),
  })
  .strict();
