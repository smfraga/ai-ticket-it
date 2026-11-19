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
// Con `organizadorId` trae solo los eventos de ese organizador ("Mis eventos"); `precioMin` y `precioMax` filtran
// por precio (ver RANGOS_DE_PRECIO en utils/eventos.js).
export const listarEventos = ({ texto, categoriaId, organizadorId, precioMin, precioMax, orden, periodo } = {}) =>
  api.get("/eventos", { texto, categoriaId, organizadorId, precioMin, precioMax, orden, periodo });

export const obtenerEvento = (id) => api.get(`/eventos/${id}`);

export const listarCategorias = () => api.get("/categorias");

// Favoritos: solo con rol COMPRADOR (403 si no). Guardar y quitar son idempotentes (201/200 y 204).
// La lista tiene el formato del catálogo, el último guardado primero, y también trae eventos ya realizados.
export const listarFavoritos = () => api.get("/favoritos");

export const guardarFavorito = (eventoId) => api.post(`/eventos/${eventoId}/favorito`);

export const quitarFavorito = (eventoId) => api.delete(`/eventos/${eventoId}/favorito`);

// Requiere sesión con rol ORGANIZADOR (403 si no). Cuerpo: { nombre, descripcion?, categoriaId, fecha (ISO, futura),
// tiposEntrada: [{ nombre, precio, cupo }] }. Devuelve el evento creado, con el formato del catálogo.
export const crearEvento = (datos) => api.post("/eventos", datos);

// Solo el organizador del evento. Cuerpo: lo que cambia (ver armarEdicionParaEnviar en utils/eventos.js); los tipos
// con `id` se editan, sin `id` se crean y los que faltan se quitan. 409 si viola una regla (cupo, precio con ventas).
export const editarEvento = (id, datos) => api.patch(`/eventos/${id}`, datos);

// { organizador: { id, nombre, apellido, puntaje, cantidadResenias }, resenias: [...] }, las más recientes primero.
export const listarReseniasDelOrganizador = (organizadorId) => api.get(`/organizadores/${organizadorId}/resenias`);
