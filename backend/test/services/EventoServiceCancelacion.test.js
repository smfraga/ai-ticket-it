import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../errors/AppError.js";
import { EventoService } from "../../services/EventoService.js";
import {
  AHORA,
  crearCategoria,
  crearComprador,
  crearCompraEn,
  crearEvento,
  crearOrganizador,
} from "../helpers/domainFactories.js";

const { PENDIENTE, CONFIRMADA, CANCELADA, REEMBOLSADA, UTILIZADA } = estadoCompra;
const rock = Object.assign(crearCategoria({ nombre: "Rock" }), { id: "c-rock" });

describe("EventoService.cancelar", () => {
  let olivia;
  let evento;
  let compras;
  let eventoRepository;
  let compraRepository;
  let service;

  beforeEach(() => {
    olivia = crearOrganizador({ id: "olivia", nombre: "Olivia", apellido: "Rossi" });
    evento = crearEvento({ organizador: olivia, categoria: rock });
    evento.id = "evento";
    evento.tiposEntrada.forEach((tipo, i) => (tipo.id = `tipo-${i}`));

    const de = (id) => ({ evento, comprador: crearComprador({ id }) });
    compras = {
      confirmada: crearCompraEn(CONFIRMADA, { ...de("c1"), cantidad: 3 }), // 3 × $10.000
      pendiente: crearCompraEn(PENDIENTE, de("c2")),
      cancelada: crearCompraEn(CANCELADA, de("c3")),
    };

    eventoRepository = {
      findById: jest.fn(async (id) => (id === "evento" ? evento : null)),
      findAll: jest.fn(async () => [evento]),
      save: jest.fn(async (e) => e),
    };
    compraRepository = {
      findByEventoId: jest.fn().mockResolvedValue(Object.values(compras)),
      save: jest.fn(async (c) => c),
    };
    service = new EventoService(
      eventoRepository,
      { findById: jest.fn() },
      { findById: jest.fn(async (id) => (id === "olivia" ? olivia : null)) },
      { findByOrganizadorId: jest.fn().mockResolvedValue([]) },
      () => AHORA,
      compraRepository,
    );
  });

  it("cancela el evento, reembolsa las confirmadas, cancela las pendientes y avisa a cada una", async () => {
    const respuesta = await service.cancelar("olivia", "evento");

    expect(respuesta).toMatchObject({ id: "evento", cancelado: true });
    expect(eventoRepository.save).toHaveBeenCalledWith(evento);
    expect(compras.confirmada.estado).toBe(REEMBOLSADA);
    expect(compras.pendiente.estado).toBe(CANCELADA);
    expect(compras.confirmada.mensajes.map((m) => m.mensaje)).toEqual([
      "Cancelamos el evento. Te reintegramos $30.000.",
    ]);
    expect(compras.pendiente.mensajes.map((m) => m.mensaje)).toEqual([
      "Cancelamos el evento. Tu compra pendiente quedó cancelada.",
    ]);
    expect(compras.confirmada.mensajes[0]).toMatchObject({ usuario: olivia, enviado: AHORA });
  });

  it("no toca ni avisa a las compras que ya no estaban activas", async () => {
    await service.cancelar("olivia", "evento");

    expect(compras.cancelada.mensajes).toHaveLength(0);
    expect(compraRepository.save).toHaveBeenCalledTimes(2);
  });

  it("401 sin usuario, 404 sin evento y, si el dominio rechaza (409), no toca las compras", async () => {
    await expect(service.cancelar("nadie", "evento")).rejects.toThrow(UnauthorizedError);
    await expect(service.cancelar("olivia", "otro")).rejects.toThrow(NotFoundError);

    evento.cancelado = true;
    await expect(service.cancelar("olivia", "evento")).rejects.toThrow(ConflictError);
    expect(compras.confirmada.estado).toBe(CONFIRMADA);
    expect(compraRepository.save).not.toHaveBeenCalled();
  });

  describe("en el catálogo", () => {
    it("un evento cancelado no aparece en la búsqueda, pero sí al filtrar por su organizador", async () => {
      evento.cancelado = true;

      expect(await service.buscar({ periodo: "todos" })).toEqual([]);
      const deOlivia = await service.buscar({ periodo: "todos", organizadorId: "olivia" });
      expect(deOlivia).toEqual([expect.objectContaining({ id: "evento", cancelado: true })]);
    });

    it("el detalle sigue disponible y dice que está cancelado", async () => {
      evento.cancelado = true;

      expect(await service.getById("evento")).toMatchObject({ id: "evento", cancelado: true });
    });
  });

  // El organizador puede marcar utilizada una entrada antes de la fecha (decisión del caso de uso c).
  it("una compra ya utilizada de un evento próximo no cambia ni recibe aviso", async () => {
    compras.utilizada = crearCompraEn(UTILIZADA, { evento, comprador: crearComprador({ id: "c4" }) });
    compraRepository.findByEventoId.mockResolvedValue(Object.values(compras));

    await service.cancelar("olivia", "evento");

    expect(compras.utilizada.estado).toBe(UTILIZADA);
    expect(compras.utilizada.mensajes).toHaveLength(0);
  });
});
