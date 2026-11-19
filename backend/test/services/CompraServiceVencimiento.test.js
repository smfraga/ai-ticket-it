import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import { CompraService } from "../../services/CompraService.js";
import { INTERVALO_DE_VENCIMIENTO_MS, programarVencimientos } from "../../services/programarVencimientos.js";
import { crearCompra, crearCompraEn, crearEvento, enDias } from "../helpers/domainFactories.js";

const { PENDIENTE, CONFIRMADA, CANCELADA } = estadoCompra;

describe("CompraService.vencerPendientes", () => {
  let compras;
  let compraRepository;
  let service;

  beforeEach(() => {
    const evento = crearEvento({ fecha: enDias(30) });
    compras = {
      vieja: crearCompra({ evento, ahora: enDias(-8) }), // venció hace un día
      nueva: crearCompra({ evento, ahora: enDias(-2) }), // le quedan 5 días
      confirmada: crearCompraEn(CONFIRMADA, { evento }),
    };
    compraRepository = {
      findByEstado: jest.fn(async (estado) => Object.values(compras).filter((c) => c.estado === estado)),
      save: jest.fn(async (c) => c),
    };
    service = new CompraService(compraRepository, {}, {}, () => enDias(0));
  });

  it("cancela solo las pendientes vencidas, guarda esas y devuelve cuántas fueron", async () => {
    expect(await service.vencerPendientes()).toBe(1);

    expect(compraRepository.findByEstado).toHaveBeenCalledWith(PENDIENTE);
    expect(compras.vieja.estado).toBe(CANCELADA);
    expect(compras.nueva.estado).toBe(PENDIENTE);
    expect(compraRepository.save).toHaveBeenCalledTimes(1);
    expect(compraRepository.save).toHaveBeenCalledWith(compras.vieja);
  });

  it("sin pendientes vencidas no guarda nada", async () => {
    compras.vieja.vencer(enDias(0));
    compraRepository.save.mockClear();

    expect(await service.vencerPendientes()).toBe(0);
    expect(compraRepository.save).not.toHaveBeenCalled();
  });

  it("la respuesta de una compra trae la fecha límite solo si está pendiente", () => {
    expect(service.toCompraResponse(compras.nueva, enDias(0)).fechaLimiteDePago).toBe(enDias(5).toISOString());
    expect(service.toCompraResponse(compras.confirmada, enDias(0)).fechaLimiteDePago).toBeNull();
  });
});

describe("programarVencimientos", () => {
  let logger;

  beforeEach(() => {
    jest.useFakeTimers();
    logger = { info: jest.fn(), error: jest.fn() };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("corre al arrancar y después cada minuto", async () => {
    const service = { vencerPendientes: jest.fn().mockResolvedValue(0) };

    const intervalo = programarVencimientos(service, undefined, logger);
    expect(service.vencerPendientes).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(INTERVALO_DE_VENCIMIENTO_MS);
    expect(service.vencerPendientes).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(INTERVALO_DE_VENCIMIENTO_MS);
    expect(service.vencerPendientes).toHaveBeenCalledTimes(3);

    clearInterval(intervalo);
    expect(INTERVALO_DE_VENCIMIENTO_MS).toBe(60 * 1000);
  });

  it("registra cuántas vencieron, y nada si no venció ninguna", async () => {
    const service = { vencerPendientes: jest.fn().mockResolvedValueOnce(2).mockResolvedValue(0) };

    const intervalo = programarVencimientos(service, 1000, logger);
    await Promise.resolve();
    await Promise.resolve();
    expect(logger.info).toHaveBeenCalledWith("Vencimiento automático: 2 compra(s) pendiente(s) cancelada(s)");

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();
    expect(logger.info).toHaveBeenCalledTimes(1);
    clearInterval(intervalo);
  });

  it("si falla, lo registra y sigue intentando en la próxima vuelta", async () => {
    const service = {
      vencerPendientes: jest.fn().mockRejectedValueOnce(new Error("se cayó")).mockResolvedValue(0),
    };

    const intervalo = programarVencimientos(service, 1000, logger);
    await Promise.resolve();
    await Promise.resolve();
    expect(logger.error).toHaveBeenCalledWith("Falló el vencimiento automático de compras: se cayó");

    jest.advanceTimersByTime(1000);
    expect(service.vencerPendientes).toHaveBeenCalledTimes(2);
    clearInterval(intervalo);
  });
});
