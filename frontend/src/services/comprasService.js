import { api } from "./api";

// Requiere sesión de comprador. El pago está simulado: la compra vuelve CONFIRMADA en el mismo pedido.
// Devuelve { id, estado, cantidad, total, diasRestantes, fecha, evento, tipoEntrada, historial }.
// Las compras del usuario logueado, las más recientes primero. `diasRestantes` solo tiene valor si está CONFIRMADA.
export const listarMisCompras = () => api.get("/compras");

export const comprar =(eventoId, { tipoEntradaId, cantidad }) =>
  api.post(`/eventos/${eventoId}/compras`, { tipoEntradaId, cantidad });
