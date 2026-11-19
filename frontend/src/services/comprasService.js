import { api } from "./api";

// Las compras del usuario logueado, las más recientes primero. `diasRestantes` solo tiene valor si está CONFIRMADA.
export const listarMisCompras = () => api.get("/compras");

// El detalle trae lo de la lista más comprador, organizador, `evento.yaPaso` y `resenia` (o null).
// Lo ven el comprador y el organizador del evento.
export const obtenerCompra = (id) => api.get(`/compras/${id}`);

// Solo el comprador. Una CONFIRMADA queda REEMBOLSADA y una PENDIENTE queda CANCELADA; las entradas vuelven al cupo.
export const cancelarCompra = (id) => api.post(`/compras/${id}/cancelar`);

// Chat de la compra: lo leen y escriben el comprador y el organizador del evento, en cualquier estado.
// Cada mensaje: { autor: { id, nombre, apellido, rol }, mensaje, enviado }, del más viejo al más nuevo.
export const listarMensajes = (compraId) => api.get(`/compras/${compraId}/mensajes`);

export const enviarMensaje = (compraId, mensaje) => api.post(`/compras/${compraId}/mensajes`, { mensaje });

// Solo el comprador, una vez por compra y con la compra UTILIZADA. Puntuación entera de 1 a 5 y comentario obligatorio.
export const reseniarCompra = (compraId, { puntuacion, detalle }) =>
  api.post(`/compras/${compraId}/resenia`, { puntuacion, detalle });

// Solo el organizador del evento (403 si no). Devuelve { evento, tiposEntrada: [{ id, nombre, cupo, cupoRestante }],
// compras: [...] }, cada compra con `comprador` (id, nombre y apellido), las más recientes primero.
export const listarComprasDelEvento = (eventoId) => api.get(`/eventos/${eventoId}/compras`);

// Requiere sesión de comprador. El pago está simulado: la compra vuelve CONFIRMADA en el mismo pedido.
// Devuelve { id, estado, cantidad, total, diasRestantes, fecha, evento, tipoEntrada, historial }.
export const comprar = (eventoId, { tipoEntradaId, cantidad }) =>
  api.post(`/eventos/${eventoId}/compras`, { tipoEntradaId, cantidad });
