import { describe, expect, it } from "@jest/globals";
import {
  estadisticasDeComprador,
  estadisticasDeOrganizador,
  historialDeComprador,
  historialDeOrganizador,
} from "../../domain/Estadisticas.js";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import {
  crearCategoria,
  crearComprador,
  crearCompraEn,
  crearEvento,
  crearOrganizador,
  crearTipoEntrada,
  enDias,
} from "../helpers/domainFactories.js";

const { PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA } = estadoCompra;

const olivia = crearOrganizador({ id: "olivia" });
const carla = crearComprador({ id: "carla" });
const recitales = crearCategoria({ nombre: "Recitales" });
const teatro = crearCategoria({ nombre: "Teatro" });

// Evento con id, de Olivia, con un solo tipo de entrada de $1000 y cupo 100 (salvo que se pida otra cosa).
function evento(id, dias, overrides = {}) {
  const creado = crearEvento({
    organizador: olivia,
    fecha: enDias(dias),
    categoria: recitales,
    tiposEntrada: [crearTipoEntrada({ precio: 1000, cupo: 100 })],
    ...overrides,
  });
  creado.id = id;
  return creado;
}

// `compradaHace`: días antes de AHORA (para desempatar la categoría preferida).
const compra = (estado, del, cantidad = 1, compradaHace = 5) =>
  crearCompraEn(estado, { evento: del, comprador: carla, cantidad, ahora: enDias(-compradaHace) });

// "Ahora" para las estadísticas: con 60 días, los eventos a 10 y 20 días ya pasaron y los de 90, no.
const DESPUES = enDias(60);

describe("estadisticasDeComprador", () => {
  it("cuenta entradas y gasto solo de compras confirmadas o utilizadas (ni pendientes, ni canceladas, ni reembolsadas)", () => {
    const rock = evento("rock", 20);
    const compras = [
      compra(CONFIRMADA, rock, 2),
      compra(UTILIZADA, rock, 3),
      compra(PENDIENTE, rock, 4),
      compra(CANCELADA, rock, 5),
      compra(REEMBOLSADA, rock, 6),
    ];

    const estadisticas = estadisticasDeComprador(compras, 0, DESPUES);

    expect(estadisticas.entradasCompradas).toBe(5);
    expect(estadisticas.totalGastado).toBe(5000);
  });

  it("los eventos a los que fue son los distintos con alguna compra utilizada", () => {
    const rock = evento("rock", 10);
    const jazz = evento("jazz", 20);
    const obra = evento("obra", 20);
    const compras = [
      compra(UTILIZADA, rock),
      compra(UTILIZADA, rock),
      compra(UTILIZADA, jazz),
      compra(CONFIRMADA, obra),
    ];

    expect(estadisticasDeComprador(compras, 0, DESPUES).eventosALosQueFue).toBe(2);
  });

  it("informa las reseñas que dejó", () => {
    expect(estadisticasDeComprador([], 3, DESPUES).reseniasDejadas).toBe(3);
  });

  it("la categoría preferida es la de más entradas pagas", () => {
    const rock = evento("rock", 20);
    const obra = evento("obra", 20, { categoria: teatro });
    const compras = [compra(CONFIRMADA, rock, 1), compra(CONFIRMADA, obra, 3), compra(CANCELADA, rock, 9)];

    expect(estadisticasDeComprador(compras, 0, DESPUES).categoriaPreferida).toBe("Teatro");
  });

  it("si dos categorías empatan, gana la de la compra más reciente", () => {
    const rock = evento("rock", 20);
    const obra = evento("obra", 20, { categoria: teatro });
    const compras = [compra(CONFIRMADA, rock, 2, 1), compra(CONFIRMADA, obra, 2, 8)];

    expect(estadisticasDeComprador(compras, 0, DESPUES).categoriaPreferida).toBe("Recitales");
  });

  it("sin compras: todo en cero y sin categoría preferida ni próximo evento", () => {
    expect(estadisticasDeComprador([], 0, DESPUES)).toEqual({
      entradasCompradas: 0,
      totalGastado: 0,
      eventosALosQueFue: 0,
      reseniasDejadas: 0,
      categoriaPreferida: null,
      proximoEvento: null,
    });
  });

  it("el próximo evento es el confirmado más cercano que todavía no pasó ni se canceló", () => {
    const pasado = evento("pasado", 20);
    const lejano = evento("lejano", 120);
    const cercano = evento("cercano", 90);
    const cancelado = evento("cancelado", 70);
    const pendiente = evento("pendiente", 65);
    const compras = [
      compra(CONFIRMADA, pasado),
      compra(CONFIRMADA, lejano),
      compra(CONFIRMADA, cercano),
      compra(CONFIRMADA, cancelado),
      compra(PENDIENTE, pendiente),
    ];
    cancelado.cancelado = true;

    expect(estadisticasDeComprador(compras, 0, DESPUES).proximoEvento).toBe(cercano);
  });
});

describe("historialDeComprador", () => {
  it("lista los eventos a los que fue, el más reciente primero, con sus compras utilizadas", () => {
    const viejo = evento("viejo", 10);
    const reciente = evento("reciente", 20);
    const primera = compra(UTILIZADA, viejo);
    const segunda = compra(UTILIZADA, reciente);
    const tercera = compra(UTILIZADA, reciente);

    const historial = historialDeComprador([primera, segunda, compra(CONFIRMADA, viejo), tercera]);

    expect(historial).toEqual([
      { evento: reciente, compras: [segunda, tercera] },
      { evento: viejo, compras: [primera] },
    ]);
  });

  it("sin compras utilizadas, el historial está vacío", () => {
    expect(historialDeComprador([compra(CONFIRMADA, evento("rock", 20))])).toEqual([]);
  });
});

describe("estadisticasDeOrganizador", () => {
  it("cuenta sus eventos por estado: próximos, realizados y cancelados", () => {
    const realizado = evento("realizado", 10);
    const proximo = evento("proximo", 90);
    const cancelado = evento("cancelado", 90);
    cancelado.cancelado = true;

    const { eventosCreados } = estadisticasDeOrganizador([realizado, proximo, cancelado], [], [], DESPUES);

    expect(eventosCreados).toEqual({ total: 3, proximos: 1, realizados: 1, cancelados: 1 });
  });

  it("entradas vendidas y recaudación solo de compras confirmadas o utilizadas", () => {
    const rock = evento("rock", 20);
    const compras = [compra(CONFIRMADA, rock, 2), compra(UTILIZADA, rock, 1), compra(REEMBOLSADA, rock, 4)];

    const estadisticas = estadisticasDeOrganizador([rock], compras, [], DESPUES);

    expect(estadisticas.entradasVendidas).toBe(3);
    expect(estadisticas.recaudacion).toBe(3000);
  });

  it("el evento más vendido es el de más entradas pagas, entre todos sus eventos (también los próximos)", () => {
    const realizado = evento("realizado", 10);
    const proximo = evento("proximo", 90);
    const compras = [
      compra(UTILIZADA, realizado, 4),
      compra(CONFIRMADA, proximo, 6),
      compra(REEMBOLSADA, realizado, 9),
    ];

    expect(estadisticasDeOrganizador([realizado, proximo], compras, [], DESPUES).eventoMasVendido).toEqual({
      evento: proximo,
      entradasVendidas: 6,
    });
  });

  it("si dos eventos venden las mismas entradas, gana el que más recaudó y después el más reciente", () => {
    const barato = evento("barato", 10);
    const caro = evento("caro", 20, { tiposEntrada: [crearTipoEntrada({ precio: 5000, cupo: 100 })] });
    const viejo = evento("viejo", 10);
    const nuevo = evento("nuevo", 20);

    expect(
      estadisticasDeOrganizador(
        [barato, caro],
        [compra(CONFIRMADA, caro, 2), compra(CONFIRMADA, barato, 2)],
        [],
        DESPUES,
      ).eventoMasVendido.evento,
    ).toBe(caro);
    expect(
      estadisticasDeOrganizador(
        [viejo, nuevo],
        [compra(CONFIRMADA, viejo, 2), compra(CONFIRMADA, nuevo, 2)],
        [],
        DESPUES,
      ).eventoMasVendido.evento,
    ).toBe(nuevo);
  });

  it("sin entradas vendidas no hay evento más vendido (null)", () => {
    const rock = evento("rock", 90);

    expect(estadisticasDeOrganizador([rock], [compra(PENDIENTE, rock, 3)], [], DESPUES).eventoMasVendido).toBeNull();
  });

  it("el puntaje es el promedio de sus reseñas, con la cantidad", () => {
    const estadisticas = estadisticasDeOrganizador([], [], [{ puntuacion: 5 }, { puntuacion: 4 }], DESPUES);

    expect(estadisticas.puntaje).toBe(4.5);
    expect(estadisticas.cantidadResenias).toBe(2);
  });
});

describe("historialDeOrganizador", () => {
  it("los eventos realizados (sin los cancelados ni los próximos), el más reciente primero, con lo vendido", () => {
    const viejo = evento("viejo", 10);
    const reciente = evento("reciente", 20);
    const cancelado = evento("cancelado", 15);
    cancelado.cancelado = true;
    const proximo = evento("proximo", 90);
    const compras = [compra(UTILIZADA, viejo, 2), compra(CONFIRMADA, reciente, 3), compra(REEMBOLSADA, reciente, 1)];

    expect(historialDeOrganizador([viejo, cancelado, proximo, reciente], compras, DESPUES)).toEqual([
      { evento: reciente, entradasVendidas: 3, recaudacion: 3000 },
      { evento: viejo, entradasVendidas: 2, recaudacion: 2000 },
    ]);
  });
});
