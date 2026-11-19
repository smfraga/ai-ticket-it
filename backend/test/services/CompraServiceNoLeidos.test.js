import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ForbiddenError } from "../../errors/AppError.js";
import { CompraService } from "../../services/CompraService.js";
import {
  AHORA,
  crearComprador,
  crearCompra,
  crearEvento,
  crearOrganizador,
  enDias,
} from "../helpers/domainFactories.js";

describe("CompraService: mensajes no leídos", () => {
  let olivia;
  let carla;
  let compra;
  let compraRepository;
  let service;

  beforeEach(() => {
    olivia = crearOrganizador({ id: "olivia" });
    carla = crearComprador({ id: "carla" });
    compra = crearCompra({ evento: crearEvento({ organizador: olivia }), comprador: carla, ahora: enDias(-2) });
    compra.id = "compra-1";
    compra.agregarMensaje(carla, "Hola", enDias(-1));

    const usuarios = { olivia, carla, camilo: crearComprador({ id: "camilo" }) };
    compraRepository = {
      findById: jest.fn(async (id) => (id === "compra-1" ? compra : null)),
      findByCompradorId: jest.fn(async () => [compra]),
      save: jest.fn(async (c) => c),
    };
    service = new CompraService(
      compraRepository,
      {},
      { findById: jest.fn(async (id) => usuarios[id] ?? null) },
      () => AHORA,
      { findByCompraId: jest.fn().mockResolvedValue(null) },
    );
  });

  it("leer el chat lo marca como leído para quien lo pide, con la hora del servidor, y lo guarda", async () => {
    expect(compra.mensajesNoLeidosPara(olivia)).toBe(1);

    await service.leerMensajes("olivia", "compra-1");

    expect(compra.lecturas.get("olivia")).toEqual(AHORA);
    expect(compra.mensajesNoLeidosPara(olivia)).toBe(0);
    expect(compraRepository.save).toHaveBeenCalledWith(compra);
  });

  it("un usuario ajeno no puede leer el chat (403) y no queda registrado", async () => {
    await expect(service.leerMensajes("camilo", "compra-1")).rejects.toThrow(ForbiddenError);
    expect(compra.lecturas.has("camilo")).toBe(false);
    expect(compraRepository.save).not.toHaveBeenCalled();
  });

  it("el detalle y la lista cuentan los mensajes nuevos desde el lado de quien pide", async () => {
    expect((await service.obtenerPorId("olivia", "compra-1")).mensajesNoLeidos).toBe(1);
    expect((await service.obtenerPorId("carla", "compra-1")).mensajesNoLeidos).toBe(0);
    expect((await service.listarDelComprador("carla"))[0].mensajesNoLeidos).toBe(0);
  });

  it("ver el detalle no cuenta como leer el chat", async () => {
    await service.obtenerPorId("olivia", "compra-1");

    expect(compra.mensajesNoLeidosPara(olivia)).toBe(1);
  });
});
