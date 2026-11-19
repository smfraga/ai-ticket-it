import { ForbiddenError, ValidationError } from "../errors/AppError.js";
import { rolUsuario } from "./RolUsuario.js";

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Dos eventos son el mismo si tienen el mismo id; si todavía no tienen, si son el mismo objeto.
function mismoEvento(uno, otro) {
  if (!uno || !otro) return false;
  if (uno.id != null && otro.id != null) return uno.id === otro.id;
  return uno === otro;
}

export class Usuario {
  id;
  nombre;
  apellido;
  email;
  passwordHash;
  roles;
  favoritos;

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
      throw new ValidationError(`El rol del usuario debe ser ${Object.values(rolUsuario).join(" u ")}`);
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

  // Guarda un evento entre los favoritos del comprador. Devuelve true si lo agregó y false si ya estaba:
  // guardar dos veces el mismo evento no es un error, solo no cambia nada.
  agregarFavorito(evento) {
    this.#exigirSerComprador();
    if (!evento) {
      throw new ValidationError("Hay que indicar el evento a guardar como favorito");
    }
    if (this.esFavorito(evento)) return false;
    this.favoritos.push(evento);
    return true;
  }

  // Quita un evento de los favoritos. Devuelve true si lo quitó y false si no estaba.
  quitarFavorito(evento) {
    this.#exigirSerComprador();
    const posicion = this.favoritos.findIndex((favorito) => mismoEvento(favorito, evento));
    if (posicion === -1) return false;
    this.favoritos.splice(posicion, 1);
    return true;
  }

  esFavorito(evento) {
    return this.favoritos.some((favorito) => mismoEvento(favorito, evento));
  }

  // Una copia con el último guardado primero (así no se puede modificar la lista desde afuera).
  listarFavoritos() {
    this.#exigirSerComprador();
    return [...this.favoritos].reverse();
  }

  #exigirSerComprador() {
    if (!this.tieneRol(rolUsuario.COMPRADOR)) {
      throw new ForbiddenError("Solo un comprador puede guardar eventos favoritos");
    }
  }

  // Compara por id cuando ambos ya están guardados; si no, por referencia.
  esElMismo(otro) {
    if (!otro) return false;
    if (this.id != null && otro.id != null) return this.id === otro.id;
    return this === otro;
  }
}
