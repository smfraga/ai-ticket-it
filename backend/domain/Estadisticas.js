import { estadoCompra } from "./EstadoCompra.js";
import { calcularPuntaje } from "./Puntaje.js";

// Estadísticas e historial del perfil, como funciones puras sobre las entidades: el service solo junta los datos.
// Una entrada cuenta como comprada (o vendida) si la compra está CONFIRMADA o UTILIZADA: una PENDIENTE todavía no
// se pagó y una CANCELADA o REEMBOLSADA no se cobró o se devolvió.
const ESTADOS_PAGOS = [estadoCompra.CONFIRMADA, estadoCompra.UTILIZADA];

export const estaPaga = (compra) => ESTADOS_PAGOS.includes(compra.estado);

const sumar = (lista, valor) => lista.reduce((total, elemento) => total + valor(elemento), 0);
const fechaDeCompra = (compra) => compra.historial[0].fechaHora;
const masRecienteArriba = (a, b) => b.evento.fecha - a.evento.fecha;

// La categoría con más entradas pagas; si empatan, la de la compra más reciente. null si no compró nada.
function categoriaPreferida(pagas) {
  const porCategoria = new Map();
  for (const compra of pagas) {
    const { nombre } = compra.evento.categoria;
    const actual = porCategoria.get(nombre) ?? { nombre, entradas: 0, ultima: 0 };
    actual.entradas += compra.cantidad;
    actual.ultima = Math.max(actual.ultima, fechaDeCompra(compra).getTime());
    porCategoria.set(nombre, actual);
  }
  const [primera] = [...porCategoria.values()].sort((a, b) => b.entradas - a.entradas || b.ultima - a.ultima);
  return primera?.nombre ?? null;
}

// El evento confirmado más cercano que todavía no pasó (y no se canceló), o null.
function proximoEvento(compras, ahora) {
  const proximas = compras
    .filter((compra) => compra.estado === estadoCompra.CONFIRMADA)
    .map((compra) => compra.evento)
    .filter((evento) => !evento.yaPaso(ahora) && !evento.cancelado)
    .sort((a, b) => a.fecha - b.fecha);
  return proximas[0] ?? null;
}

export function estadisticasDeComprador(compras, cantidadDeResenias, ahora = new Date()) {
  const pagas = compras.filter(estaPaga);
  const utilizadas = compras.filter((compra) => compra.estado === estadoCompra.UTILIZADA);
  return {
    entradasCompradas: sumar(pagas, (compra) => compra.cantidad),
    totalGastado: sumar(pagas, (compra) => compra.total),
    eventosALosQueFue: new Set(utilizadas.map((compra) => compra.evento.id)).size,
    reseniasDejadas: cantidadDeResenias,
    categoriaPreferida: categoriaPreferida(pagas),
    proximoEvento: proximoEvento(compras, ahora),
  };
}

// Los eventos a los que fue (compras UTILIZADA), el más reciente primero, cada uno con sus compras.
export function historialDeComprador(compras) {
  const porEvento = new Map();
  for (const compra of compras.filter((c) => c.estado === estadoCompra.UTILIZADA)) {
    const fila = porEvento.get(compra.evento.id) ?? { evento: compra.evento, compras: [] };
    fila.compras.push(compra);
    porEvento.set(compra.evento.id, fila);
  }
  return [...porEvento.values()].sort(masRecienteArriba);
}

const realizado = (evento, ahora) => evento.yaPaso(ahora) && !evento.cancelado;

// Lo vendido (pago) en cada evento: { evento, entradasVendidas, recaudacion }.
const ventasPorEvento = (eventos, pagas) =>
  eventos.map((evento) => {
    const delEvento = pagas.filter((compra) => compra.evento.id === evento.id);
    return {
      evento,
      entradasVendidas: sumar(delEvento, (compra) => compra.cantidad),
      recaudacion: sumar(delEvento, (compra) => compra.total),
    };
  });

// El evento con más entradas vendidas (de todos los suyos); si empatan, el que más recaudó y después el más
// reciente. null si todavía no vendió ninguna.
function eventoMasVendido(eventos, pagas) {
  const [primero] = ventasPorEvento(eventos, pagas)
    .filter((ventas) => ventas.entradasVendidas > 0)
    .sort(
      (a, b) =>
        b.entradasVendidas - a.entradasVendidas || b.recaudacion - a.recaudacion || b.evento.fecha - a.evento.fecha,
    );
  return primero ? { evento: primero.evento, entradasVendidas: primero.entradasVendidas } : null;
}

// `compras`: las de todos sus eventos. `resenias`: las de todos sus eventos (base del puntaje).
export function estadisticasDeOrganizador(eventos, compras, resenias, ahora = new Date()) {
  const pagas = compras.filter(estaPaga);
  return {
    eventosCreados: {
      total: eventos.length,
      proximos: eventos.filter((evento) => !evento.yaPaso(ahora) && !evento.cancelado).length,
      realizados: eventos.filter((evento) => realizado(evento, ahora)).length,
      cancelados: eventos.filter((evento) => evento.cancelado).length,
    },
    entradasVendidas: sumar(pagas, (compra) => compra.cantidad),
    recaudacion: sumar(pagas, (compra) => compra.total),
    eventoMasVendido: eventoMasVendido(eventos, pagas),
    puntaje: calcularPuntaje(resenias),
    cantidadResenias: resenias.length,
  };
}

// Los eventos que ya hizo (realizados, sin los cancelados), el más reciente primero, con lo que vendió en cada uno.
export function historialDeOrganizador(eventos, compras, ahora = new Date()) {
  const realizados = eventos.filter((evento) => realizado(evento, ahora));
  return ventasPorEvento(realizados, compras.filter(estaPaga)).sort(masRecienteArriba);
}
