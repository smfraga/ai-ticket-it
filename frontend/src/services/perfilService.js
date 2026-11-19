import { api } from "./api";

// Cambia nombre y apellido del usuario logueado. Devuelve el usuario como en la sesión ({ id, nombre, apellido,
// email, roles }). El token no cambia.
export const editarPerfil = ({ nombre, apellido }) => api.patch("/perfil", { nombre, apellido });
