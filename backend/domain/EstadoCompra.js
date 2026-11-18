export const estadoCompra = Object.freeze({
  PENDIENTE: "PENDIENTE",
  CONFIRMADA: "CONFIRMADA",
  UTILIZADA: "UTILIZADA",
  CANCELADA: "CANCELADA",
  REEMBOLSADA: "REEMBOLSADA",
});

export const transicionesCompra = Object.freeze({
  [estadoCompra.PENDIENTE]: Object.freeze([estadoCompra.CONFIRMADA, estadoCompra.CANCELADA]),
  [estadoCompra.CONFIRMADA]: Object.freeze([estadoCompra.UTILIZADA, estadoCompra.CANCELADA]),
  [estadoCompra.CANCELADA]: Object.freeze([estadoCompra.REEMBOLSADA]),
  [estadoCompra.UTILIZADA]: Object.freeze([]),
  [estadoCompra.REEMBOLSADA]: Object.freeze([]),
});
