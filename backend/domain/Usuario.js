import { ForbiddenError, ValidationError } from "../errors/AppError.js";
import { tipoDeImagen } from "./Imagen.js";
import { rolUsuario } from "./RolUsuario.js";

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Las mismas reglas al registrarse y al editar el perfil: texto no vacío.
function validarNombre(nombre) {
  if (typeof nombre !== "string" || !nombre.trim()) {
    throw new ValidationError("El usuario debe tener un nombre");
  }
}

function validarApellido(apellido) {
  if (typeof apellido !== "string" || !apellido.trim()) {
    throw new ValidationError("El usuario debe tener un apellido");
  }
}

// Foto de perfil: la app la achica a 256×256 antes de mandarla, así que 64 KB sobran.
export const TAMANIO_MAXIMO_DE_FOTO = 64 * 1024;

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
  foto; // { tipo, datos (Buffer), version } o null
  versionDeFoto;

  constructor(nombre, apellido, email, passwordHash, roles) {
    validarNombre(nombre);
    validarApellido(apellido);
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
    this.foto = null;
    this.versionDeFoto = 0;
  }

  // Edita el nombre y el apellido desde el perfil. Los dos son opcionales (cambia solo lo que viene), pero si
  // vienen no pueden quedar vacíos; se guardan sin espacios en los bordes. Valida todo antes de cambiar: si el
  // apellido es inválido, el nombre tampoco cambia. El email y los roles no se editan.
  cambiarNombre({ nombre, apellido } = {}) {
    if (nombre === undefined && apellido === undefined) {
      throw new ValidationError("Hay que indicar el nombre o el apellido a cambiar");
    }
    if (nombre !== undefined) validarNombre(nombre);
    if (apellido !== undefined) validarApellido(apellido);

    if (nombre !== undefined) this.nombre = nombre.trim();
    if (apellido !== undefined) this.apellido = apellido.trim();
  }

  // Guarda la foto de perfil (bytes de un JPEG o PNG, hasta 64 KB) y sube su versión: la URL de la foto lleva la
  // versión, así el celular no muestra una vieja que tenía guardada.
  cambiarFoto(datos) {
    if (!Buffer.isBuffer(datos) || datos.length === 0) {
      throw new ValidationError("Hay que mandar una imagen");
    }
    if (datos.length > TAMANIO_MAXIMO_DE_FOTO) {
      throw new ValidationError(`La foto no puede superar los ${TAMANIO_MAXIMO_DE_FOTO / 1024} KB`);
    }
    const tipo = tipoDeImagen(datos);
    if (!tipo) {
      throw new ValidationError("La foto tiene que ser una imagen JPEG o PNG");
    }
    this.versionDeFoto += 1;
    this.foto = { tipo, datos, version: this.versionDeFoto };
  }

  // Quita la foto (vuelven las iniciales). Sin foto no es un error: no cambia nada.
  quitarFoto() {
    if (!this.foto) return;
    this.versionDeFoto += 1;
    this.foto = null;
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
