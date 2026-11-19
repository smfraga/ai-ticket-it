import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../errors/AppError.js";
import { CompraService } from "../../services/CompraService.js";
import {
  AHORA,
  crearComprador,
  crearCompraEn,
  crearEvento,
  crearOrganizador,
  crearTipoEntrada,
  enDias,
} from "../helpers/domainFactories.js";

describe("CompraService", () => {
  let compraRepository;
  let eventoRepository;
  let usuarioRepository;
  let resenaRepository;
  let service;
  let carla;
  let camilo;
  let olivia;
  let octavio;
  let general;
  let vip;
  let evento;

  beforeEach(() => {
    carla = crearComprador({ id: "carla", nombre: "Carla", apellido: "Gómez" });
    camilo = crearComprador({ id: "camilo", nombre: "Camilo", apellido: "Díaz", email: "camilo@example.com" });
    olivia = crearOrganizador({ id: "olivia" });
    octavio = crearOrganizador({ id: "octavio", email: "octavio@example.com" });
    general = crearTipoEntrada({ nombre: "General", precio: 10000, cupo: 5 });
    vip = crearTipoEntrada({ nombre: "VIP", precio: 25000, cupo: 2 });
    general.id = "t-general";
    vip.id = "t-vip";
    evento = crearEvento({ organizador: olivia, tiposEntrada: [general, vip], fecha: enDias(10) });
    evento.id = "evento-1";

    const usuarios = { carla, camilo, olivia, octavio };
    compraRepository = {
      save: jest.fn(async (compra) => {
        compra.id ??= "compra-nueva";
        return compra;
      }),
      findById: jest.fn().mockResolvedValue(null),
      findByCompradorId: jest.fn().mockResolvedValue([]),
      findByEventoId: jest.fn().mockResolvedValue([]),
    };
    eventoRepository = {
      findById: jest.fn(async (id) => (id === "evento-1" ? evento : null)),
    };
    usuarioRepository = { findById: jest.fn(async (id) => usuarios[id] ?? null) };
    resenaRepository = { findByCompraId: jest.fn().mockResolvedValue(null) };
    service = new CompraService(compraRepository, eventoRepository, usuarioRepository, () => AHORA, resenaRepository);
  });

  describe("comprar", () => {
    it("crea la compra, la confirma en el mismo request y reserva el cupo", async () => {
      const respuesta = await service.comprar("carla", "evento-1", { tipoEntradaId: "t-general", cantidad: 2 });

      expect(respuesta).toMatchObject({
        id: "compra-nueva",
        estado: estadoCompra.CONFIRMADA,
        cantidad: 2,
        total: 20000,
        diasRestantes: 10,
        evento: { id: "evento-1" },
        tipoEntrada: { id: "t-general", cupoRestante: 3 },
      });
      expect(respuesta.historial.map((c) => c.estado)).toEqual([
        estadoCompra.PENDIENTE,
        estadoCompra.CONFIRMADA,
      ]);
      expect(general.disponibles()).toBe(3);
      expect(compraRepository.save).toHaveBeenCalledTimes(1);
    });

    it("permite comprar justo el cupo que queda", async () => {
      await service.comprar("carla", "evento-1", { tipoEntradaId: "t-vip", cantidad: 2 });

      expect(vip.disponibles()).toBe(0);
    });

    it("409 si la cantidad supera el cupo, sin guardar ni reservar nada", async () => {
      await expect(
        service.comprar("carla", "evento-1", { tipoEntradaId: "t-vip", cantidad: 3 }),
      ).rejects.toBeInstanceOf(ConflictError);

      expect(vip.disponibles()).toBe(2);
      expect(compraRepository.save).not.toHaveBeenCalled();
    });

    it("409 si el cupo se agotó en compras anteriores", async () => {
      await service.comprar("carla", "evento-1", { tipoEntradaId: "t-vip", cantidad: 2 });

      await expect(
        service.comprar("camilo", "evento-1", { tipoEntradaId: "t-vip", cantidad: 1 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("409 si el evento ya pasó", async () => {
      evento.fecha = enDias(-1);

      await expect(
        service.comprar("carla", "evento-1", { tipoEntradaId: "t-general", cantidad: 1 }),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(compraRepository.save).not.toHaveBeenCalled();
    });

    it("403 si el usuario no tiene rol COMPRADOR", async () => {
      await expect(
        service.comprar("octavio", "evento-1", { tipoEntradaId: "t-general", cantidad: 1 }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(general.disponibles()).toBe(5);
    });

    it("400 si la cantidad no es válida", async () => {
      await expect(
        service.comprar("carla", "evento-1", { tipoEntradaId: "t-general", cantidad: 0 }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("404 si el evento no existe", async () => {
      await expect(
        service.comprar("carla", "otro", { tipoEntradaId: "t-general", cantidad: 1 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("404 si el tipo de entrada no es de ese evento", async () => {
      await expect(
        service.comprar("carla", "evento-1", { tipoEntradaId: "t-de-otro-evento", cantidad: 1 }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(compraRepository.save).not.toHaveBeenCalled();
    });

    it("401 si el usuario del token ya no existe", async () => {
      await expect(
        service.comprar("fantasma", "evento-1", { tipoEntradaId: "t-general", cantidad: 1 }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("cancelar", () => {
    const guardarCompra = (estado) => {
      const compra = Object.assign(crearCompraEn(estado, { comprador: carla, evento }), { id: "c1" });
      compraRepository.findById.mockImplementation(async (id) => (id === "c1" ? compra : null));
      return compra;
    };

    it("una compra CONFIRMADA queda REEMBOLSADA, libera el cupo y se guarda", async () => {
      const compra = guardarCompra(estadoCompra.CONFIRMADA);

      const respuesta = await service.cancelar("carla", "c1");

      expect(respuesta.estado).toBe(estadoCompra.REEMBOLSADA);
      expect(respuesta.diasRestantes).toBeNull();
      expect(respuesta.historial.map((c) => c.estado)).toEqual([
        estadoCompra.PENDIENTE,
        estadoCompra.CONFIRMADA,
        estadoCompra.CANCELADA,
        estadoCompra.REEMBOLSADA,
      ]);
      expect(general.disponibles()).toBe(5);
      expect(compraRepository.save).toHaveBeenCalledWith(compra);
    });

    it("una compra PENDIENTE queda CANCELADA", async () => {
      guardarCompra(estadoCompra.PENDIENTE);

      const respuesta = await service.cancelar("carla", "c1");

      expect(respuesta.estado).toBe(estadoCompra.CANCELADA);
    });

    it("403 si la cancela otro comprador o el organizador, sin guardar", async () => {
      const compra = guardarCompra(estadoCompra.CONFIRMADA);

      await expect(service.cancelar("camilo", "c1")).rejects.toBeInstanceOf(ForbiddenError);
      await expect(service.cancelar("olivia", "c1")).rejects.toBeInstanceOf(ForbiddenError);
      expect(compra.estado).toBe(estadoCompra.CONFIRMADA);
      expect(compraRepository.save).not.toHaveBeenCalled();
    });

    it("409 si la compra está UTILIZADA", async () => {
      guardarCompra(estadoCompra.UTILIZADA);

      await expect(service.cancelar("carla", "c1")).rejects.toBeInstanceOf(ConflictError);
      expect(compraRepository.save).not.toHaveBeenCalled();
    });

    it("409 si el evento ya pasó", async () => {
      guardarCompra(estadoCompra.CONFIRMADA);
      evento.fecha = enDias(-1);

      await expect(service.cancelar("carla", "c1")).rejects.toBeInstanceOf(ConflictError);
    });

    it("409 si ya estaba cancelada", async () => {
      guardarCompra(estadoCompra.CANCELADA);

      await expect(service.cancelar("carla", "c1")).rejects.toBeInstanceOf(ConflictError);
    });

    it("404 si la compra no existe", async () => {
      await expect(service.cancelar("carla", "otra")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("401 si el usuario del token ya no existe", async () => {
      await expect(service.cancelar("fantasma", "c1")).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("pagar", () => {
    const guardarCompra = (estado) => {
      const compra = Object.assign(crearCompraEn(estado, { comprador: carla, evento }), { id: "c1" });
      compraRepository.findById.mockImplementation(async (id) => (id === "c1" ? compra : null));
      return compra;
    };

    it("el comprador pasa una compra PENDIENTE a CONFIRMADA y se guarda", async () => {
      const compra = guardarCompra(estadoCompra.PENDIENTE);

      const respuesta = await service.pagar("carla", "c1");

      expect(respuesta.estado).toBe(estadoCompra.CONFIRMADA);
      expect(respuesta.diasRestantes).toEqual(expect.any(Number));
      expect(respuesta.historial.at(-1).quien.id).toBe("carla");
      expect(compraRepository.save).toHaveBeenCalledWith(compra);
    });

    it("403 si paga otro comprador o el organizador, sin guardar", async () => {
      guardarCompra(estadoCompra.PENDIENTE);

      await expect(service.pagar("camilo", "c1")).rejects.toBeInstanceOf(ForbiddenError);
      await expect(service.pagar("olivia", "c1")).rejects.toBeInstanceOf(ForbiddenError);
      expect(compraRepository.save).not.toHaveBeenCalled();
    });

    it("409 si ya estaba confirmada, sin guardar", async () => {
      guardarCompra(estadoCompra.CONFIRMADA);

      await expect(service.pagar("carla", "c1")).rejects.toBeInstanceOf(ConflictError);
      expect(compraRepository.save).not.toHaveBeenCalled();
    });

    it("404 si la compra no existe y 401 si el usuario del token ya no existe", async () => {
      await expect(service.pagar("carla", "otra")).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.pagar("fantasma", "c1")).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("utilizar", () => {
    const guardarCompra = (estado) => {
      const compra = Object.assign(crearCompraEn(estado, { comprador: carla, evento }), { id: "c1" });
      compraRepository.findById.mockImplementation(async (id) => (id === "c1" ? compra : null));
      return compra;
    };

    it("el organizador pasa una compra CONFIRMADA a UTILIZADA y se guarda", async () => {
      const compra = guardarCompra(estadoCompra.CONFIRMADA);

      const respuesta = await service.utilizar("olivia", "c1");

      expect(respuesta.estado).toBe(estadoCompra.UTILIZADA);
      expect(respuesta.historial.at(-1).quien.id).toBe("olivia");
      expect(compraRepository.save).toHaveBeenCalledWith(compra);
    });

    it("403 si la marca el comprador o el organizador de otro evento, sin guardar", async () => {
      const compra = guardarCompra(estadoCompra.CONFIRMADA);

      await expect(service.utilizar("carla", "c1")).rejects.toBeInstanceOf(ForbiddenError);
      await expect(service.utilizar("octavio", "c1")).rejects.toBeInstanceOf(ForbiddenError);
      expect(compra.estado).toBe(estadoCompra.CONFIRMADA);
      expect(compraRepository.save).not.toHaveBeenCalled();
    });

    it.each([estadoCompra.PENDIENTE, estadoCompra.CANCELADA, estadoCompra.UTILIZADA])(
      "409 si la compra está %s",
      async (estado) => {
        guardarCompra(estado);

        await expect(service.utilizar("olivia", "c1")).rejects.toBeInstanceOf(ConflictError);
        expect(compraRepository.save).not.toHaveBeenCalled();
      },
    );

    it("404 si la compra no existe", async () => {
      await expect(service.utilizar("olivia", "otra")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("401 si el usuario del token ya no existe", async () => {
      await expect(service.utilizar("fantasma", "c1")).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("chat de la compra", () => {
    let compra;

    beforeEach(() => {
      compra = Object.assign(crearCompraEn(estadoCompra.CONFIRMADA, { comprador: carla, evento }), { id: "c1" });
      compraRepository.findById.mockImplementation(async (id) => (id === "c1" ? compra : null));
    });

    describe("enviarMensaje", () => {
      it("el comprador escribe: se guarda y vuelve con su rol en la compra", async () => {
        const respuesta = await service.enviarMensaje("carla", "c1", "¿A qué hora abren?");

        expect(respuesta).toEqual({
          autor: { id: "carla", nombre: "Carla", apellido: "Gómez", rol: "COMPRADOR" },
          mensaje: "¿A qué hora abren?",
          enviado: AHORA.toISOString(),
        });
        expect(compra.mensajes).toHaveLength(1);
        expect(compraRepository.save).toHaveBeenCalledWith(compra);
      });

      it("el organizador del evento escribe y su rol es ORGANIZADOR", async () => {
        const respuesta = await service.enviarMensaje("olivia", "c1", "A las 20");

        expect(respuesta.autor).toMatchObject({ id: "olivia", rol: "ORGANIZADOR" });
        expect(compra.mensajes).toHaveLength(1);
      });

      it("se puede escribir aunque la compra esté REEMBOLSADA", async () => {
        compra = Object.assign(crearCompraEn(estadoCompra.REEMBOLSADA, { comprador: carla, evento }), {
          id: "c1",
        });

        const respuesta = await service.enviarMensaje("carla", "c1", "Gracias por el reembolso");

        expect(respuesta.mensaje).toBe("Gracias por el reembolso");
      });

      it("403 si escribe otro comprador u otro organizador, sin guardar", async () => {
        await expect(service.enviarMensaje("camilo", "c1", "Hola")).rejects.toBeInstanceOf(ForbiddenError);
        await expect(service.enviarMensaje("octavio", "c1", "Hola")).rejects.toBeInstanceOf(ForbiddenError);
        expect(compra.mensajes).toHaveLength(0);
        expect(compraRepository.save).not.toHaveBeenCalled();
      });

      it("400 si el texto está vacío, sin guardar", async () => {
        await expect(service.enviarMensaje("carla", "c1", "   ")).rejects.toBeInstanceOf(ValidationError);
        expect(compra.mensajes).toHaveLength(0);
        expect(compraRepository.save).not.toHaveBeenCalled();
      });

      it("404 si la compra no existe", async () => {
        await expect(service.enviarMensaje("carla", "otra", "Hola")).rejects.toBeInstanceOf(NotFoundError);
      });

      it("401 si el usuario del token ya no existe", async () => {
        await expect(service.enviarMensaje("fantasma", "c1", "Hola")).rejects.toBeInstanceOf(
          UnauthorizedError,
        );
      });
    });

    describe("leerMensajes", () => {
      it("el comprador y el organizador leen la conversación en el orden en que se escribió", async () => {
        await service.enviarMensaje("carla", "c1", "Primero");
        await service.enviarMensaje("olivia", "c1", "Segundo");
        await service.enviarMensaje("carla", "c1", "Tercero");

        for (const lector of ["carla", "olivia"]) {
          const mensajes = await service.leerMensajes(lector, "c1");

          expect(mensajes.map((m) => [m.mensaje, m.autor.rol])).toEqual([
            ["Primero", "COMPRADOR"],
            ["Segundo", "ORGANIZADOR"],
            ["Tercero", "COMPRADOR"],
          ]);
        }
      });

      it("una compra sin mensajes devuelve una lista vacía", async () => {
        expect(await service.leerMensajes("carla", "c1")).toEqual([]);
      });

      it("no expone el email ni el hash de los autores", async () => {
        await service.enviarMensaje("carla", "c1", "Hola");
        await service.enviarMensaje("olivia", "c1", "Hola, Carla");

        const texto = JSON.stringify(await service.leerMensajes("carla", "c1"));

        expect(texto).not.toContain(carla.email);
        expect(texto).not.toContain(olivia.email);
        expect(texto).not.toContain("passwordHash");
      });

      it("403 si lee otro comprador u otro organizador", async () => {
        await service.enviarMensaje("carla", "c1", "Hola");

        await expect(service.leerMensajes("camilo", "c1")).rejects.toBeInstanceOf(ForbiddenError);
        await expect(service.leerMensajes("octavio", "c1")).rejects.toBeInstanceOf(ForbiddenError);
      });

      it("404 si la compra no existe", async () => {
        await expect(service.leerMensajes("carla", "otra")).rejects.toBeInstanceOf(NotFoundError);
      });

      it("401 si el usuario del token ya no existe", async () => {
        await expect(service.leerMensajes("fantasma", "c1")).rejects.toBeInstanceOf(UnauthorizedError);
      });
    });
  });

  describe("obtenerPorId", () => {
    let compra;

    beforeEach(() => {
      compra = Object.assign(crearCompraEn(estadoCompra.CONFIRMADA, { comprador: carla, evento }), { id: "c1" });
      compraRepository.findById.mockImplementation(async (id) => (id === "c1" ? compra : null));
    });

    it("el comprador y el organizador ven la compra con comprador, organizador y evento", async () => {
      for (const lector of ["carla", "olivia"]) {
        const respuesta = await service.obtenerPorId(lector, "c1");

        expect(respuesta).toMatchObject({
          id: "c1",
          estado: estadoCompra.CONFIRMADA,
          diasRestantes: 10,
          comprador: { id: "carla", nombre: "Carla", apellido: "Gómez" },
          evento: { id: "evento-1", yaPaso: false, organizador: { id: "olivia" } },
        });
        expect(respuesta.historial.length).toBeGreaterThan(0);
      }
    });

    it("sin reseña devuelve resenia en null", async () => {
      expect((await service.obtenerPorId("carla", "c1")).resenia).toBeNull();
      expect(resenaRepository.findByCompraId).toHaveBeenCalledWith("c1");
    });

    it("con reseña la devuelve con puntuación, comentario y fecha", async () => {
      resenaRepository.findByCompraId.mockResolvedValue({
        id: "r1",
        puntuacion: 5,
        detalle: "Genial",
        fecha: AHORA,
        compra,
      });

      expect((await service.obtenerPorId("carla", "c1")).resenia).toEqual({
        id: "r1",
        puntuacion: 5,
        detalle: "Genial",
        fecha: AHORA.toISOString(),
      });
    });

    it("no expone el email ni el hash del comprador ni del organizador", async () => {
      const texto = JSON.stringify(await service.obtenerPorId("olivia", "c1"));

      expect(texto).not.toContain("passwordHash");
      expect(texto).not.toContain("email");
    });

    it("yaPaso es true si el evento ya se realizó", async () => {
      expect((await service.obtenerPorId("carla", "c1")).evento.yaPaso).toBe(false);

      evento.fecha = enDias(-3); // el dominio no deja comprar un evento pasado: se mueve la fecha después

      expect((await service.obtenerPorId("carla", "c1")).evento.yaPaso).toBe(true);
    });

    it("403 si la ve otro comprador u otro organizador", async () => {
      await expect(service.obtenerPorId("camilo", "c1")).rejects.toThrow(ForbiddenError);
      await expect(service.obtenerPorId("octavio", "c1")).rejects.toThrow(ForbiddenError);
      expect(resenaRepository.findByCompraId).not.toHaveBeenCalled();
    });

    it("404 si la compra no existe", async () => {
      await expect(service.obtenerPorId("carla", "inexistente")).rejects.toThrow(NotFoundError);
    });

    it("401 si el usuario del token ya no existe", async () => {
      await expect(service.obtenerPorId("fantasma", "c1")).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("listarDelComprador", () => {
    it("muestra el estado y los días restantes solo si está CONFIRMADA", async () => {
      const confirmada = crearCompraEn(estadoCompra.CONFIRMADA, { comprador: carla, evento });
      const cancelada = crearCompraEn(estadoCompra.CANCELADA, { comprador: carla, evento });
      Object.assign(confirmada, { id: "c1" });
      Object.assign(cancelada, { id: "c2" });
      compraRepository.findByCompradorId.mockResolvedValue([confirmada, cancelada]);

      const respuesta = await service.listarDelComprador("carla");

      expect(compraRepository.findByCompradorId).toHaveBeenCalledWith("carla");
      expect(respuesta.map((c) => [c.id, c.estado, c.diasRestantes])).toEqual([
        ["c1", estadoCompra.CONFIRMADA, 10],
        ["c2", estadoCompra.CANCELADA, null],
      ]);
    });

    it("devuelve una lista vacía si no compró nada", async () => {
      expect(await service.listarDelComprador("carla")).toEqual([]);
    });

    it("401 si el usuario del token ya no existe", async () => {
      await expect(service.listarDelComprador("fantasma")).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("listarDeEvento", () => {
    it("el organizador ve las compras con estado, comprador y cupo restante por tipo", async () => {
      const compra = Object.assign(crearCompraEn(estadoCompra.CONFIRMADA, { comprador: carla, evento }), {
        id: "c1",
      });
      compraRepository.findByEventoId.mockResolvedValue([compra]);

      const respuesta = await service.listarDeEvento("olivia", "evento-1");

      expect(compraRepository.findByEventoId).toHaveBeenCalledWith("evento-1");
      expect(respuesta.tiposEntrada).toEqual([
        { id: "t-general", nombre: "General", cupo: 5, cupoRestante: 3 },
        { id: "t-vip", nombre: "VIP", cupo: 2, cupoRestante: 2 },
      ]);
      expect(respuesta.compras).toHaveLength(1);
      expect(respuesta.compras[0]).toMatchObject({
        id: "c1",
        estado: estadoCompra.CONFIRMADA,
        comprador: { id: "carla", nombre: "Carla", apellido: "Gómez" },
      });
    });

    it("no expone el email ni el hash del comprador", async () => {
      compraRepository.findByEventoId.mockResolvedValue([
        crearCompraEn(estadoCompra.CONFIRMADA, { comprador: carla, evento }),
      ]);

      const texto = JSON.stringify(await service.listarDeEvento("olivia", "evento-1"));

      expect(texto).not.toContain(carla.email);
      expect(texto).not.toContain("passwordHash");
    });

    it("403 si el usuario no es el organizador de ese evento", async () => {
      await expect(service.listarDeEvento("octavio", "evento-1")).rejects.toBeInstanceOf(ForbiddenError);
      expect(compraRepository.findByEventoId).not.toHaveBeenCalled();
    });

    it("403 si es un comprador", async () => {
      await expect(service.listarDeEvento("carla", "evento-1")).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("404 si el evento no existe", async () => {
      await expect(service.listarDeEvento("olivia", "otro")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("401 si el usuario del token ya no existe", async () => {
      await expect(service.listarDeEvento("fantasma", "evento-1")).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });
});
