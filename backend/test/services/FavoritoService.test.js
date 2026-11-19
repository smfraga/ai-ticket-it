import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../../errors/AppError.js";
import { EventoService } from "../../services/EventoService.js";
import { FavoritoService } from "../../services/FavoritoService.js";
import { AHORA, crearComprador, crearEvento, crearOrganizador, enDias } from "../helpers/domainFactories.js";

describe("FavoritoService", () => {
  let usuarioRepository;
  let eventoRepository;
  let service;
  let carla;
  let camilo;
  let olivia;
  let rock;
  let jazz;
  let obra;

  const conId = (evento, id, nombre) => Object.assign(evento, { id, nombre });

  beforeEach(() => {
    carla = crearComprador({ id: "carla", nombre: "Carla", apellido: "Gómez", email: "carla@example.com" });
    camilo = crearComprador({ id: "camilo", nombre: "Camilo", apellido: "Díaz", email: "camilo@example.com" });
    olivia = crearOrganizador({ id: "olivia", nombre: "Olivia", apellido: "Rossi", email: "olivia@example.com" });
    rock = conId(crearEvento({ organizador: olivia, fecha: enDias(10) }), "rock", "Rock");
    jazz = conId(crearEvento({ organizador: olivia, fecha: enDias(30) }), "jazz", "Jazz");
    obra = conId(crearEvento({ organizador: olivia, fecha: enDias(-5) }), "obra", "Obra ya realizada");

    const usuarios = { carla, camilo, olivia };
    const eventos = { rock, jazz, obra };
    usuarioRepository = {
      findById: jest.fn(async (id) => usuarios[id] ?? null),
      save: jest.fn(async (usuario) => usuario),
    };
    eventoRepository = { findById: jest.fn(async (id) => eventos[id] ?? null) };
    const resenaRepository = {
      findByOrganizadorId: jest.fn(async () => [{ puntuacion: 5 }, { puntuacion: 4 }]),
    };
    const eventoService = new EventoService(eventoRepository, {}, usuarioRepository, resenaRepository, () => AHORA);
    service = new FavoritoService(usuarioRepository, eventoRepository, eventoService, () => AHORA);
  });

  describe("guardar", () => {
    it("agrega el evento a los favoritos, lo persiste y lo devuelve con el formato del catálogo", async () => {
      const { agregado, evento } = await service.guardar("carla", "rock");

      expect(agregado).toBe(true);
      expect(carla.favoritos).toEqual([rock]);
      expect(usuarioRepository.save).toHaveBeenCalledWith(carla);
      expect(evento).toMatchObject({
        id: "rock",
        nombre: "Rock",
        yaPaso: false,
        organizador: { id: "olivia", nombre: "Olivia", puntaje: 4.5 },
      });
      expect(evento.tiposEntrada.length).toBeGreaterThan(0);
    });

    it("si ya era favorito devuelve agregado=false, sin error y sin guardar de nuevo", async () => {
      await service.guardar("carla", "rock");
      usuarioRepository.save.mockClear();

      const { agregado, evento } = await service.guardar("carla", "rock");

      expect(agregado).toBe(false);
      expect(evento.id).toBe("rock");
      expect(carla.favoritos).toHaveLength(1);
      expect(usuarioRepository.save).not.toHaveBeenCalled();
    });

    it("403 si el usuario no es comprador, y no guarda nada", async () => {
      await expect(service.guardar("olivia", "rock")).rejects.toBeInstanceOf(ForbiddenError);
      expect(olivia.favoritos).toEqual([]);
      expect(usuarioRepository.save).not.toHaveBeenCalled();
    });

    it("404 si el evento no existe", async () => {
      await expect(service.guardar("carla", "otro")).rejects.toBeInstanceOf(NotFoundError);
      expect(carla.favoritos).toEqual([]);
    });

    it("401 si el usuario del token ya no existe", async () => {
      await expect(service.guardar("fantasma", "rock")).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("se puede guardar un evento que ya se realizó", async () => {
      const { agregado, evento } = await service.guardar("carla", "obra");

      expect(agregado).toBe(true);
      expect(evento.yaPaso).toBe(true);
    });
  });

  describe("quitar", () => {
    it("saca el evento de los favoritos y lo persiste", async () => {
      await service.guardar("carla", "rock");
      await service.guardar("carla", "jazz");
      usuarioRepository.save.mockClear();

      await service.quitar("carla", "rock");

      expect(carla.favoritos).toEqual([jazz]);
      expect(usuarioRepository.save).toHaveBeenCalledWith(carla);
    });

    it("quitar uno que no era favorito no es un error y no persiste nada", async () => {
      await expect(service.quitar("carla", "rock")).resolves.toBeUndefined();
      expect(usuarioRepository.save).not.toHaveBeenCalled();
    });

    it("403 si el usuario no es comprador", async () => {
      await expect(service.quitar("olivia", "rock")).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("404 si el evento no existe", async () => {
      await expect(service.quitar("carla", "otro")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("401 si el usuario del token ya no existe", async () => {
      await expect(service.quitar("fantasma", "rock")).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("listar", () => {
    it("devuelve los favoritos con el último guardado primero y el formato del catálogo", async () => {
      await service.guardar("carla", "rock");
      await service.guardar("carla", "jazz");
      await service.guardar("carla", "obra");

      const lista = await service.listar("carla");

      expect(lista.map((e) => e.id)).toEqual(["obra", "jazz", "rock"]);
      expect(lista.map((e) => e.yaPaso)).toEqual([true, false, false]);
      expect(lista[0]).toMatchObject({ precioDesde: expect.any(Number), organizador: { puntaje: 4.5 } });
    });

    it("cada comprador ve solo los suyos", async () => {
      await service.guardar("carla", "rock");
      await service.guardar("camilo", "jazz");

      expect((await service.listar("carla")).map((e) => e.id)).toEqual(["rock"]);
      expect((await service.listar("camilo")).map((e) => e.id)).toEqual(["jazz"]);
    });

    it("sin favoritos devuelve una lista vacía", async () => {
      expect(await service.listar("carla")).toEqual([]);
    });

    it("no expone el email ni el hash de nadie", async () => {
      await service.guardar("carla", "rock");

      const texto = JSON.stringify(await service.listar("carla"));

      expect(texto).not.toContain("olivia@example.com");
      expect(texto).not.toContain("carla@example.com");
      expect(texto).not.toContain("passwordHash");
    });

    it("403 si el usuario no es comprador", async () => {
      await expect(service.listar("olivia")).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("401 si el usuario del token ya no existe", async () => {
      await expect(service.listar("fantasma")).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });
});
