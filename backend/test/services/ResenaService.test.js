import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../errors/AppError.js";
import { ResenaService } from "../../services/ResenaService.js";
import {
  AHORA,
  crearComprador,
  crearCompraEn,
  crearEvento,
  crearOrganizador,
  crearResenia,
  enDias,
} from "../helpers/domainFactories.js";

describe("ResenaService", () => {
  let guardadas;
  let resenaRepository;
  let compraRepository;
  let eventoRepository;
  let usuarioRepository;
  let service;
  let carla;
  let camilo;
  let olivia;
  let octavio;
  let evento;
  let compras;

  const guardarCompra = (id, estado, comprador = carla) => {
    const compra = Object.assign(crearCompraEn(estado, { comprador, evento }), { id });
    compras[id] = compra;
    return compra;
  };

  beforeEach(() => {
    carla = crearComprador({ id: "carla", nombre: "Carla", apellido: "Gómez" });
    camilo = crearComprador({ id: "camilo", nombre: "Camilo", apellido: "Díaz", email: "camilo@example.com" });
    olivia = crearOrganizador({ id: "olivia", nombre: "Olivia", apellido: "Rossi" });
    octavio = crearOrganizador({ id: "octavio", email: "octavio@example.com" });
    evento = Object.assign(crearEvento({ organizador: olivia, fecha: enDias(10) }), { id: "evento-1", nombre: "Rock" });
    compras = {};
    guardadas = [];

    const usuarios = { carla, camilo, olivia, octavio };
    resenaRepository = {
      save: jest.fn(async (resenia) => {
        resenia.id ??= `resenia-${guardadas.length + 1}`;
        guardadas.push(resenia);
        return resenia;
      }),
      findByCompraId: jest.fn(async (id) => guardadas.find((r) => r.compra.id === id) ?? null),
      findByEventoId: jest.fn(async (id) => guardadas.filter((r) => r.evento.id === id)),
      findByOrganizadorId: jest.fn(async (id) => guardadas.filter((r) => r.evento.organizador.id === id)),
    };
    compraRepository = { findById: jest.fn(async (id) => compras[id] ?? null) };
    eventoRepository = { findById: jest.fn(async (id) => (id === "evento-1" ? evento : null)) };
    usuarioRepository = { findById: jest.fn(async (id) => usuarios[id] ?? null) };
    service = new ResenaService(resenaRepository, compraRepository, eventoRepository, usuarioRepository, () => AHORA);
  });

  describe("resenar", () => {
    it("el comprador reseña su compra UTILIZADA: se guarda y vuelve sin datos privados", async () => {
      guardarCompra("c1", estadoCompra.UTILIZADA);

      const respuesta = await service.resenar("carla", "c1", { puntuacion: 5, detalle: "Impecable" });

      expect(respuesta).toEqual({
        id: "resenia-1",
        puntuacion: 5,
        detalle: "Impecable",
        fecha: AHORA.toISOString(),
        autor: { id: "carla", nombre: "Carla", apellido: "Gómez" },
        evento: { id: "evento-1", nombre: "Rock" },
      });
      expect(resenaRepository.save).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(respuesta)).not.toMatch(/@example.com|passwordHash/);
    });

    it("409 si la compra ya tiene una reseña, sin guardar otra", async () => {
      guardarCompra("c1", estadoCompra.UTILIZADA);
      await service.resenar("carla", "c1", { puntuacion: 5, detalle: "Impecable" });

      await expect(service.resenar("carla", "c1", { puntuacion: 1, detalle: "Cambié de idea" })).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(guardadas).toHaveLength(1);
    });

    it.each([
      ["PENDIENTE", estadoCompra.PENDIENTE],
      ["CONFIRMADA", estadoCompra.CONFIRMADA],
      ["CANCELADA", estadoCompra.CANCELADA],
      ["REEMBOLSADA", estadoCompra.REEMBOLSADA],
    ])("409 si la compra está %s (solo se reseña una UTILIZADA)", async (_n, estado) => {
      guardarCompra("c1", estado);

      await expect(service.resenar("carla", "c1", { puntuacion: 5, detalle: "Bien" })).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(resenaRepository.save).not.toHaveBeenCalled();
    });

    it("403 si reseña otro comprador o el organizador, sin guardar", async () => {
      guardarCompra("c1", estadoCompra.UTILIZADA);

      await expect(service.resenar("camilo", "c1", { puntuacion: 5, detalle: "Bien" })).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      await expect(service.resenar("olivia", "c1", { puntuacion: 5, detalle: "Bien" })).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(resenaRepository.save).not.toHaveBeenCalled();
    });

    it("un ajeno recibe 403 y no 409, aunque la compra ya tenga reseña", async () => {
      guardarCompra("c1", estadoCompra.UTILIZADA);
      await service.resenar("carla", "c1", { puntuacion: 5, detalle: "Impecable" });

      await expect(service.resenar("camilo", "c1", { puntuacion: 1, detalle: "Mal" })).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it.each([
      ["puntuación 0", { puntuacion: 0, detalle: "Bien" }],
      ["puntuación 6", { puntuacion: 6, detalle: "Bien" }],
      ["puntuación decimal", { puntuacion: 3.5, detalle: "Bien" }],
      ["comentario vacío", { puntuacion: 4, detalle: "   " }],
    ])("400 con %s, sin guardar", async (_caso, datos) => {
      guardarCompra("c1", estadoCompra.UTILIZADA);

      await expect(service.resenar("carla", "c1", datos)).rejects.toBeInstanceOf(ValidationError);
      expect(resenaRepository.save).not.toHaveBeenCalled();
    });

    it("404 si la compra no existe", async () => {
      await expect(service.resenar("carla", "otra", { puntuacion: 5, detalle: "Bien" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("401 si el usuario del token ya no existe", async () => {
      guardarCompra("c1", estadoCompra.UTILIZADA);

      await expect(service.resenar("fantasma", "c1", { puntuacion: 5, detalle: "Bien" })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });
  });

  describe("listarDeEvento", () => {
    const resenia = (comprador, puntuacion, fecha, otroEvento = evento) =>
      Object.assign(
        crearResenia({
          compra: Object.assign(crearCompraEn(estadoCompra.UTILIZADA, { comprador, evento: otroEvento })),
          puntuacion,
        }),
        { fecha },
      );

    it("devuelve las reseñas del evento y el puntaje del organizador (todas sus reseñas)", async () => {
      const otroEvento = Object.assign(crearEvento({ organizador: olivia, fecha: enDias(20) }), {
        id: "evento-2",
        nombre: "Jazz",
      });
      guardadas.push(resenia(carla, 5, AHORA), resenia(camilo, 4, AHORA), resenia(carla, 3, AHORA, otroEvento));

      const respuesta = await service.listarDeEvento("evento-1");

      expect(respuesta.evento).toEqual({ id: "evento-1", nombre: "Rock" });
      expect(respuesta.organizador).toEqual({ id: "olivia", nombre: "Olivia", apellido: "Rossi", puntaje: 4 });
      expect(respuesta.resenias.map((r) => r.puntuacion)).toEqual([5, 4]);
    });

    it("un evento sin reseñas devuelve lista vacía y puntaje null", async () => {
      const respuesta = await service.listarDeEvento("evento-1");

      expect(respuesta.resenias).toEqual([]);
      expect(respuesta.organizador.puntaje).toBeNull();
    });

    it("no expone el email ni el hash de los autores", async () => {
      guardadas.push(resenia(camilo, 4, AHORA));

      const texto = JSON.stringify(await service.listarDeEvento("evento-1"));

      expect(texto).not.toContain("camilo@example.com");
      expect(texto).not.toContain("passwordHash");
    });

    it("404 si el evento no existe", async () => {
      await expect(service.listarDeEvento("otro")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("listarDeOrganizador", () => {
    it("devuelve el puntaje con 1 decimal, la cantidad y las reseñas de todos sus eventos", async () => {
      const otroEvento = Object.assign(crearEvento({ organizador: olivia, fecha: enDias(20) }), {
        id: "evento-2",
        nombre: "Jazz",
      });
      const hacer = (comprador, puntuacion, e) =>
        crearResenia({ compra: crearCompraEn(estadoCompra.UTILIZADA, { comprador, evento: e }), puntuacion });
      guardadas.push(hacer(carla, 5, evento), hacer(camilo, 4, evento), hacer(carla, 4, otroEvento));

      const respuesta = await service.listarDeOrganizador("olivia");

      expect(respuesta.organizador).toEqual({
        id: "olivia",
        nombre: "Olivia",
        apellido: "Rossi",
        puntaje: 4.3,
        cantidadResenias: 3,
      });
      expect(respuesta.resenias.map((r) => r.evento.nombre).sort()).toEqual(["Jazz", "Rock", "Rock"]);
    });

    it("un organizador sin reseñas devuelve puntaje null y cantidad 0", async () => {
      const respuesta = await service.listarDeOrganizador("octavio");

      expect(respuesta.organizador).toMatchObject({ puntaje: null, cantidadResenias: 0 });
      expect(respuesta.resenias).toEqual([]);
    });

    it("404 si el usuario no existe", async () => {
      await expect(service.listarDeOrganizador("fantasma")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("404 si el usuario existe pero no es organizador", async () => {
      await expect(service.listarDeOrganizador("carla")).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
