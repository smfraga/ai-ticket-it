import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Usuario } from "../domain/Usuario.js";
import { ConflictError, UnauthorizedError } from "../errors/AppError.js";
import { usuarioRepository } from "../repositories/UsuarioRepository.js";
import { rutaDeFoto } from "./fotos.js";

// bcryptjs es JavaScript puro: con costo 12 el seed tardaría demasiado en arrancar.
const COSTO_BCRYPT = 10;
const MENSAJE_CREDENCIALES_INVALIDAS = "Email o contraseña incorrectos";
const MENSAJE_EMAIL_EN_USO = "Ya existe un usuario con ese email";

export const hashearPassword = (password) => bcrypt.hash(password, COSTO_BCRYPT);

// Los datos del usuario que ve la app (en la sesión y en el perfil). Nunca incluye passwordHash.
export const toUsuarioResponse = (usuario) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  email: usuario.email,
  roles: usuario.roles,
  foto: rutaDeFoto(usuario),
});

export class AuthService {
  constructor(repositorio = usuarioRepository) {
    this.usuarioRepository = repositorio;
    this.hashFicticio = null;
  }

  async registro({ nombre, apellido, email, password, roles }) {
    if (await this.usuarioRepository.findByEmail(email)) {
      throw new ConflictError(MENSAJE_EMAIL_EN_USO);
    }

    const usuario = new Usuario(nombre, apellido, email, await hashearPassword(password), roles);
    const guardado = await this.usuarioRepository.save(usuario);

    return this.crearSesion(guardado);
  }

  async login({ email, password }) {
    const usuario = await this.usuarioRepository.findByEmail(email);

    // Se compara siempre, aunque el email no exista: así la respuesta tarda lo mismo
    // y no se puede averiguar qué emails están registrados.
    const hash = usuario?.passwordHash ?? (await this.obtenerHashFicticio());
    const coincide = await bcrypt.compare(password, hash);

    if (!usuario || !coincide) {
      throw new UnauthorizedError(MENSAJE_CREDENCIALES_INVALIDAS);
    }

    return this.crearSesion(usuario);
  }

  async obtenerHashFicticio() {
    this.hashFicticio ??= await hashearPassword("contraseña-ficticia-para-igualar-tiempos");
    return this.hashFicticio;
  }

  crearSesion(usuario) {
    const datos = toUsuarioResponse(usuario);
    const token = jwt.sign({ roles: datos.roles }, process.env.JWT_SECRET, {
      subject: datos.id,
      algorithm: "HS256",
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    });
    return { token, usuario: datos };
  }
}
