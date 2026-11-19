export const ETIQUETAS_DE_ESTADO = Object.freeze({
  PENDIENTE: "Pendiente de pago",
  CONFIRMADA: "Confirmada",
  UTILIZADA: "Utilizada",
  CANCELADA: "Cancelada",
  REEMBOLSADA: "Reembolsada",
});

// Cancelar solo se puede si no está UTILIZADA ni ya cancelada y el evento todavía no se realizó.
// El backend lo vuelve a validar (409); esto decide si se muestra el botón.
export const ESTADOS_CANCELABLES = Object.freeze(["PENDIENTE", "CONFIRMADA"]);

export const puedeCancelar = (compra) => ESTADOS_CANCELABLES.includes(compra.estado) && !compra.evento.yaPaso;

// Por qué no hay botón de cancelar; null si se puede cancelar o si el estado ya lo explica (cancelada, reembolsada).
export const motivoSinCancelacion = (compra) => {
  if (compra.estado === "UTILIZADA") return "Esta compra ya fue utilizada: no se puede cancelar.";
  if (ESTADOS_CANCELABLES.includes(compra.estado) && compra.evento.yaPaso) {
    return "El evento ya se realizó: no se puede cancelar.";
  }
  return null;
};

// Qué le pasa al dinero según el estado desde el que se cancela.
export const textoDeConfirmacionDeCancelacion = (compra, totalFormateado) =>
  compra.estado === "CONFIRMADA"
    ? `Se cancelan las entradas y se te reembolsa ${totalFormateado}.`
    : "Se cancela la compra y las entradas vuelven al cupo.";

// Marcar como utilizada: lo hace el organizador del evento, solo desde CONFIRMADA y sin límite de fecha
// (el backend lo vuelve a validar con 403 y 409).
export const puedeMarcarUtilizada = (compra) => compra.estado === "CONFIRMADA";

// Por qué el organizador no ve el botón; null si puede marcarla o si el estado ya lo explica.
export const motivoSinUtilizar = (compra) =>
  compra.estado === "PENDIENTE" ? "La compra todavía no está confirmada: no se puede marcar como utilizada." : null;

export const textoDeConfirmacionDeUso = (compra) =>
  `Confirmá que ${compra.comprador.nombre} ${compra.comprador.apellido} usó ${
    compra.cantidad === 1 ? "su entrada" : `sus ${compra.cantidad} entradas`
  }. Después ya no se puede cancelar y podrá dejar su reseña.`;

// Reseñar: solo una compra UTILIZADA que todavía no tiene reseña (el backend lo vuelve a validar con 409).
export const puedeReseniar = (compra) => compra.estado === "UTILIZADA" && !compra.resenia;

export const PUNTUACION_MINIMA = 1;
export const PUNTUACION_MAXIMA = 5;
export const ETIQUETAS_DE_PUNTUACION = Object.freeze({ 1: "Mala", 2: "Regular", 3: "Buena", 4: "Muy buena", 5: "Excelente" });

// Qué falta completar en el formulario de reseña, o null si se puede enviar.
export const errorDeResenia = ({ puntuacion, detalle }) => {
  if (!Number.isInteger(puntuacion) || puntuacion < PUNTUACION_MINIMA || puntuacion > PUNTUACION_MAXIMA) {
    return "Elegí una puntuación de 1 a 5 estrellas.";
  }
  if (!detalle.trim()) return "Escribí un comentario sobre tu experiencia.";
  return null;
};

// Solo las compras CONFIRMADAS traen los días que faltan; en las demás el backend manda null.
export const textoDiasRestantes = (dias) => {
  if (dias === null || dias === undefined) return null;
  if (dias === 0) return "El evento es hoy";
  if (dias === 1) return "Falta 1 día";
  return `Faltan ${dias} días`;
};

const PLURALES_DE_ESTADO = Object.freeze({
  PENDIENTE: ["pendiente de pago", "pendientes de pago"],
  CONFIRMADA: ["confirmada", "confirmadas"],
  UTILIZADA: ["utilizada", "utilizadas"],
  CANCELADA: ["cancelada", "canceladas"],
  REEMBOLSADA: ["reembolsada", "reembolsadas"],
});

// Para el organizador: "3 confirmadas · 1 utilizada · 1 reembolsada", en el orden del ciclo de vida de la compra.
// Los estados sin compras no aparecen; sin compras, null.
export const resumenDeEstados = (compras) => {
  const partes = Object.keys(PLURALES_DE_ESTADO)
    .map((estado) => [estado, compras.filter((compra) => compra.estado === estado).length])
    .filter(([, cantidad]) => cantidad > 0)
    .map(([estado, cantidad]) => `${cantidad} ${PLURALES_DE_ESTADO[estado][cantidad === 1 ? 0 : 1]}`);
  return partes.length ? partes.join(" · ") : null;
};

export const textoEntradas = (cantidad) => `${cantidad} ${cantidad === 1 ? "entrada" : "entradas"}`;
