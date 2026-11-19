import { UnauthorizedError } from "../errors/AppError.js";
import { usuarioRepository } from "../repositories/UsuarioRepository.js";
import { toUsuarioResponse } from "./AuthService.js";

// El perfil del usuario logueado. Las reglas (qué se puede cambiar y cómo) son de `Usuario`.
export class PerfilService {
  constructor(repositorioDeUsuarios = usuarioRepository) {
    this.usuarioRepository = repositorioDeUsuarios;
  }

  // Cambia nombre y apellido y devuelve el usuario como en la sesión. El token no cambia: solo lleva el id y los
  // roles, y ninguno de los dos se edita.
  async editar(usuarioId, datos) {
    const usuario = await this.buscarUsuario(usuarioId);
    usuario.cambiarNombre(datos);
    const guardado = await this.usuarioRepository.save(usuario);
    return toUsuarioResponse(guardado);
  }

  // Los datos viven en memoria: si el servidor se reinició, el token puede ser de un usuario que ya no existe.
  async buscarUsuario(usuarioId) {
    const usuario = await this.usuarioRepository.findById(usuarioId);
    if (!usuario) {
      throw new UnauthorizedError("La sesión ya no es válida, iniciá sesión de nuevo");
    }
    return usuario;
  }
}
