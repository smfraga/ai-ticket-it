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
  enDias,
} from "../helpers/domainFactories.js";

const rock = Object.assign(crearCategoria({ nombre: "Rock" }), { id: "c-rock" });
const teatro = Object.assign(crearCategoria({ nombre: "Teatro" }), { id: "c-teatro" });

describe("EventoService.editar", () => {
  let olivia;
  let evento;
  let compras;
  let eventoRepository;
  let compraRepository;
  let service;

  beforeEach(() => {
    olivia = crearOrganizador({ id: "olivia", nombre: "Olivia", apellido: "Rossi" });
    // 20/12/2026 a las 21:30, en la hora local de quien corre los tests (igual que el formateador).
    evento = crearEvento({ organizador: olivia, categoria: rock, fecha: new Date(2026, 11, 20, 21, 30) });
    evento.id = "evento";
    evento.tiposEntrada.forEach((tipo, i) => (tipo.id = `tipo-${i}`));

    const comprador = (id) => crearComprador({ id });
    compras = {
      pendiente: crearCompraEn(estadoCompra.PENDIENTE, { evento, comprador: comprador("c1") }),
      confirmada: crearCompraEn(estadoCompra.CONFIRMADA, { evento, comprador: comprador("c2") }),
      cancelada: crearCompraEn(estadoCompra.CANCELADA, { evento, comprador: comprador("c3") }),
    };

    eventoRepository = {
      findById: jest.fn(async (id) => (id === "evento" ? evento : null)),
      save: jest.fn(async (e) => e),
    };
    compraRepository = {
      findByEventoId: jest.fn().mockResolvedValue(Object.values(compras)),
      save: jest.fn(async (c) => c),
    };
    service = new EventoService(
      eventoRepository,
      { findById: jest.fn(async (id) => ({ "c-rock": rock, "c-teatro": teatro })[id] ?? null) },
      { findById: jest.fn(async (id) => (id === "olivia" ? olivia : null)) },
      { findByOrganizadorId: jest.fn().mockResolvedValue([{ puntuacion: 4 }]) },
      () => AHORA,
      compraRepository,
    );
  });

  it("guarda los cambios y devuelve el evento con el formato del catálogo", async () => {
    const respuesta = await service.editar("olivia", "evento", { nombre: "Rock acústico", categoriaId: "c-teatro" });

    expect(eventoRepository.save).toHaveBeenCalledWith(evento);
    expect(respuesta).toMatchObject({
      id: "evento",
      nombre: "Rock acústico",
      categoria: { id: "c-teatro", nombre: "Teatro" },
      organizador: { id: "olivia", puntaje: 4 },
    });
  });

  it("sin cambio de fecha no escribe en ningún chat", async () => {
    await service.editar("olivia", "evento", { nombre: "Otro", fecha: new Date(evento.fecha) });

    expect(compraRepository.save).not.toHaveBeenCalled();
    expect(compras.confirmada.mensajes).toHaveLength(0);
  });

  it("si cambia la fecha, avisa por el chat solo a las compras activas, a nombre del organizador", async () => {
    await service.editar("olivia", "evento", { fecha: new Date(2026, 11, 27, 22, 0) });

    const aviso = "Cambiamos la fecha del evento: era el dom 20 dic a las 21:30 y ahora es el dom 27 dic a las 22:00.";
    for (const compra of [compras.pendiente, compras.confirmada]) {
      expect(compra.mensajes).toHaveLength(1);
      expect(compra.mensajes[0]).toMatchObject({ usuario: olivia, mensaje: aviso, enviado: AHORA });
    }
    expect(compras.cancelada.mensajes).toHaveLength(0);
    expect(compraRepository.save).toHaveBeenCalledTimes(2);
  });

  it("401 si el usuario del token ya no existe y 404 si no existe el evento o la categoría", async () => {
    await expect(service.editar("nadie", "evento", { nombre: "x" })).rejects.toThrow(UnauthorizedError);
    await expect(service.editar("olivia", "otro", { nombre: "x" })).rejects.toThrow(
      new NotFoundError("El evento no existe"),
    );
    await expect(service.editar("olivia", "evento", { categoriaId: "c-nada" })).rejects.toThrow(
      new NotFoundError("La categoría no existe"),
    );
  });

  it("si el dominio rechaza la edición, no guarda ni avisa", async () => {
    const tipos = evento.tiposEntrada.map(({ id, nombre, precio, cupo }) => ({ id, nombre, precio, cupo }));
    tipos[0].cupo = 1; // la compra confirmada y la pendiente reservaron 2 cada una

    await expect(service.editar("olivia", "evento", { fecha: enDias(60), tiposEntrada: tipos })).rejects.toThrow(
      ConflictError,
    );
    expect(eventoRepository.save).not.toHaveBeenCalled();
    expect(compraRepository.save).not.toHaveBeenCalled();
  });
});
