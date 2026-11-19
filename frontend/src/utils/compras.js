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

export const textoEntradas = (cantidad) => `${cantidad} ${cantidad === 1 ? "entrada" : "entradas"}`;
