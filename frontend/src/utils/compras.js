export const ETIQUETAS_DE_ESTADO = Object.freeze({
  PENDIENTE: "Pendiente de pago",
  CONFIRMADA: "Confirmada",
  UTILIZADA: "Utilizada",
  CANCELADA: "Cancelada",
  REEMBOLSADA: "Reembolsada",
});

// Solo las compras CONFIRMADAS traen los días que faltan; en las demás el backend manda null.
export const textoDiasRestantes = (dias) => {
  if (dias === null || dias === undefined) return null;
  if (dias === 0) return "El evento es hoy";
  if (dias === 1) return "Falta 1 día";
  return `Faltan ${dias} días`;
};

export const textoEntradas = (cantidad) => `${cantidad} ${cantidad === 1 ? "entrada" : "entradas"}`;
