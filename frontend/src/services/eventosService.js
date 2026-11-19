import { api } from "./api";

export const ORDENES = Object.freeze([
  { valor: "fecha", etiqueta: "Fecha" },
  { valor: "precio", etiqueta: "Precio" },
  { valor: "puntaje", etiqueta: "Puntaje" },
]);

export const PERIODOS = Object.freeze([
  { valor: "proximos", etiqueta: "Próximos" },
  { valor: "pasados", etiqueta: "Pasados" },
  { valor: "todos", etiqueta: "Todos" },
]);

// Público: no necesita sesión. Los parámetros vacíos no se mandan (ver api.js).
// Con `organizadorId` trae solo los eventos de ese organizador ("Mis eventos").
export const listarEventos = ({ texto, categoriaId, organizadorId, orden, periodo } = {}) =>
  api.get("/eventos", { texto, categoriaId, organizadorId, orden, periodo });

export const obtenerEvento = (id) => api.get(`/eventos/${id}`);

export const listarCategorias = () => api.get("/categorias");

// Requiere sesión con rol ORGANIZADOR (403 si no). Cuerpo: { nombre, descripcion?, categoriaId, fecha (ISO, futura),
// tiposEntrada: [{ nombre, precio, cupo }] }. Devuelve el evento creado, con el formato del catálogo.
export const crearEvento = (datos) => api.post("/eventos", datos);

// { organizador: { id, nombre, apellido, puntaje, cantidadResenias }, resenias: [...] }, las más recientes primero.
export const listarReseniasDelOrganizador = (organizadorId) => api.get(`/organizadores/${organizadorId}/resenias`);
