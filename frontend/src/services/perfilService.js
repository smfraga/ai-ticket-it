import { api } from "./api";

// Cambia nombre y apellido del usuario logueado. Devuelve el usuario como en la sesión ({ id, nombre, apellido,
// email, roles }). El token no cambia.
export const editarPerfil = ({ nombre, apellido }) => api.patch("/perfil", { nombre, apellido });

// Los datos del usuario, y según sus roles `comprador` y `organizador` (o null), cada uno con `estadisticas` e
// `historial`. Ver la documentación de GET /perfil en el README.
export const obtenerPerfil = () => api.get("/perfil");

// La foto como data URL de un JPEG ya achicado. Devuelve el usuario con `foto` (la ruta nueva, con su versión).
export const cambiarFoto = (imagen) => api.put("/perfil/foto", { imagen });

// Vuelven las iniciales. Devuelve el usuario con `foto: null`.
export const quitarFoto = () => api.delete("/perfil/foto");
