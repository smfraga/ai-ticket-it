import { Usuario } from "../domain/Usuario.js";
import { rolUsuario } from "../domain/RolUsuario.js";
import { usuarioRepository } from "../repositories/UsuarioRepository.js";
import { hashearPassword } from "../services/AuthService.js";

export const PASSWORD_DE_PRUEBA = "Demo1234!";

const { COMPRADOR, ORGANIZADOR } = rolUsuario;

const USUARIOS = [
  { nombre: "Olivia", apellido: "Rossi", email: "olivia@example.com", roles: [ORGANIZADOR] },
  { nombre: "Octavio", apellido: "Benítez", email: "octavio@example.com", roles: [ORGANIZADOR] },
  { nombre: "Carla", apellido: "Gómez", email: "carla@example.com", roles: [COMPRADOR] },
  { nombre: "Camilo", apellido: "Díaz", email: "camilo@example.com", roles: [COMPRADOR] },
];

export async function cargarSeed(repositorio = usuarioRepository) {
  // Se hashea una sola vez: todos los usuarios de prueba comparten la contraseña.
  const passwordHash = await hashearPassword(PASSWORD_DE_PRUEBA);
  for (const { nombre, apellido, email, roles } of USUARIOS) {
    await repositorio.save(new Usuario(nombre, apellido, email, passwordHash, roles));
  }
}
