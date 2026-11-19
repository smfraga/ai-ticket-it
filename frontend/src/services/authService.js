import { api } from "./api";

// Ambas devuelven la sesión: { token, usuario: { id, nombre, apellido, email, roles } }.
export const login = (email, password) => api.post("/auth/login", { email: email.trim(), password });

export const registro = ({ nombre, apellido, email, password, roles }) =>
  api.post("/auth/registro", { nombre: nombre.trim(), apellido: apellido.trim(), email: email.trim(), password, roles });
