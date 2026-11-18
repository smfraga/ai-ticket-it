import { randomUUID } from "node:crypto";

// Persistencia en memoria. Los métodos son async y devuelven lo mismo que devolvería
// un repositorio sobre una base, así cambiar la persistencia no obliga a tocar los services.
export class UsuarioRepository {
  constructor() {
    this.usuarios = new Map();
  }

  async save(usuario) {
    if (usuario.id == null) {
      usuario.id = randomUUID();
    }
    this.usuarios.set(usuario.id, usuario);
    return usuario;
  }

  async findById(id) {
    return this.usuarios.get(id) ?? null;
  }

  async findByEmail(email) {
    const buscado = email.trim().toLowerCase();
    for (const usuario of this.usuarios.values()) {
      if (usuario.email === buscado) return usuario;
    }
    return null;
  }
}

// Instancia compartida: el estado vive en el repositorio, así que todos los services
// de la app tienen que usar esta misma.
export const usuarioRepository = new UsuarioRepository();
