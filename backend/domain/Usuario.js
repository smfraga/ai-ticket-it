import { ValidationError } from "../errors/AppError.js";
import { rolUsuario } from "./RolUsuario.js";

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Usuario {
  id
  nombre
  apellido
  email
  passwordHash
  roles
  favoritos

  constructor(nombre, apellido, email, passwordHash, roles) {
    if (typeof nombre !== "string" || !nombre.trim()) {
      throw new ValidationError("El usuario debe tener un nombre");
    }
    if (typeof apellido !== "string" || !apellido.trim()) {
      throw new ValidationError("El usuario debe tener un apellido");
    }
    const emailNormalizado = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!emailNormalizado) {
      throw new ValidationError("El usuario debe tener un email");
    }
    if (!FORMATO_EMAIL.test(emailNormalizado)) {
      throw new ValidationError("El email del usuario no es válido");
    }
    if (!passwordHash) {
      throw new ValidationError("El usuario debe tener una contraseña");
    }
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new ValidationError("El usuario debe tener al menos un rol");
    }
    if (roles.some((rol) => !Object.values(rolUsuario).includes(rol))) {
      throw new ValidationError(
        `El rol del usuario debe ser ${Object.values(rolUsuario).join(" u ")}`,
      );
    }
    if (new Set(roles).size !== roles.length) {
      throw new ValidationError("El usuario no puede tener roles repetidos");
    }

    this.nombre = nombre;
    this.apellido = apellido;
    this.email = emailNormalizado;
    this.passwordHash = passwordHash;
    this.roles = [...roles];
    this.favoritos = [];
  }

  tieneRol(rol) {
    return this.roles.includes(rol);
  }

  // Compara por id cuando ambos ya están guardados; si no, por referencia.
  esElMismo(otro) {
    if (!otro) return false;
    if (this.id != null && otro.id != null) return this.id === otro.id;
    return this === otro;
  }
}
