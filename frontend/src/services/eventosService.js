import { api } from "./api";

export const ORDENES = Object.freeze([
  { valor: "fecha", etiqueta: "Fecha" },
  { valor: "precio", etiqueta: "Precio" },
  { valor: "puntaje", etiqueta: "Puntaje" },
]);

// Público: no necesita sesión. Los parámetros vacíos no se mandan (ver api.js).
export const listarEventos = ({ texto, categoriaId, orden } = {}) => api.get("/eventos", { texto, categoriaId, orden });

export const listarCategorias = () => api.get("/categorias");
