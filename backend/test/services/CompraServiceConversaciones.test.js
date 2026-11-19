import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { UnauthorizedError } from "../../errors/AppError.js";
import { CompraService } from "../../services/CompraService.js";
import {
  AHORA,
  crearComprador,
  crearCompra,
  crearEvento,
  crearOrganizador,
  enDias,
} from "../helpers/domainFactories.js";

const enHoras = (horas) => enDias(horas / 24);

describe("CompraService.listarConversaciones", () => {
  let olivia;
  let carla;
  let camilo;
  let recital;
  let rockConChat;
  let jazzConChat;
  let sinMensajes;
  let compraRepository;
  let service;

  beforeEach(() => {
    olivia = crearOrganizador({ id: "olivia", nombre: "Olivia", apellido: "Rossi" });
    carla = crearComprador({ id: "carla", nombre: "Carla", apellido: "Gómez" });
    camilo = crearComprador({ id: "camilo", nombre: "Camilo", apellido: "Díaz", email: "camilo@example.com" });
    recital = crearEvento({ organizador: olivia, nombre: "Rock", multimedia: ["https://ejemplo.com/rock.jpg"] });
    recital.id = "evento-rock";
    const jazz = crearEvento({ organizador: olivia, nombre: "Jazz" });
    jazz.id = "evento-jazz";

    rockConChat = crearCompra({ evento: recital, comprador: carla, cantidad: 2, ahora: enDias(-3) });
    rockConChat.id = "rock-carla";
    rockConChat.agregarMensaje(carla, "¿A qué hora abren?", enHoras(-50));
    rockConChat.agregarMensaje(olivia, "A las 20", enHoras(-49));

    jazzConChat = crearCompra({ evento: jazz, comprador: camilo, ahora: enDias(-3) });
    jazzConChat.id = "jazz-camilo";
    jazzConChat.agregarMensaje(camilo, "¿Hay mesas?", enHoras(-2));
    jazzConChat.agregarMensaje(camilo, "¿Y estacionamiento?", enHoras(-1));

    sinMensajes = crearCompra({ evento: recital, comprador: camilo, ahora: enDias(-3) });
    sinMensajes.id = "rock-camilo";

    const usuarios = { olivia, carla, camilo };
    const compras = [rockConChat, jazzConChat, sinMensajes];
    compraRepository = {
      findByParticipanteId: jest.fn(async (id) =>
        compras.filter((c) => c.comprador.id === id || c.evento.organizador.id === id),
      ),
    };
    service = new CompraService(
      compraRepository,
      {},
      { findById: jest.fn(async (id) => usuarios[id] ?? null) },
      () => AHORA,
      {},
    );
  });

  it("deja afuera las compras sin mensajes y ordena por el último mensaje, el más reciente primero", async () => {
    const { conversaciones } = await service.listarConversaciones("olivia");

    expect(conversaciones.map((c) => c.compraId)).toEqual(["jazz-camilo", "rock-carla"]);
  });

  it("cada conversación trae el evento con su primera imagen, la entrada, la contraparte y el último mensaje", async () => {
    const { conversaciones } = await service.listarConversaciones("carla");

    expect(conversaciones).toEqual([
      {
        compraId: "rock-carla",
        evento: {
          id: "evento-rock",
          nombre: "Rock",
          imagen: "https://ejemplo.com/rock.jpg",
          fecha: recital.fecha.toISOString(),
          cancelado: false,
        },
        tipoEntrada: { nombre: rockConChat.tipoEntrada.nombre },
        cantidad: 2,
        contraparte: { id: "olivia", nombre: "Olivia", apellido: "Rossi", rol: "ORGANIZADOR", foto: null },
        ultimoMensaje: { texto: "A las 20", enviado: enHoras(-49).toISOString(), propio: false },
        noLeidos: 1,
      },
    ]);
  });

  it("para el organizador, la contraparte es el comprador, y un evento sin imagen trae null", async () => {
    const { conversaciones } = await service.listarConversaciones("olivia");
    const jazz = conversaciones.find((c) => c.compraId === "jazz-camilo");

    expect(jazz.contraparte).toEqual({
      id: "camilo",
      nombre: "Camilo",
      apellido: "Díaz",
      rol: "COMPRADOR",
      foto: null,
    });
    expect(jazz.evento.imagen).toBeNull();
  });

  it("marca como propio el último mensaje si lo escribió quien pide", async () => {
    const deOlivia = await service.listarConversaciones("olivia");
    const deCamilo = await service.listarConversaciones("camilo");

    expect(deOlivia.conversaciones.find((c) => c.compraId === "rock-carla").ultimoMensaje.propio).toBe(true);
    expect(deCamilo.conversaciones[0].ultimoMensaje.propio).toBe(true);
  });

  it("suma los mensajes nuevos de todas las conversaciones, contados desde el lado de quien pide", async () => {
    const deOlivia = await service.listarConversaciones("olivia");

    expect(deOlivia.conversaciones.map((c) => c.noLeidos)).toEqual([2, 0]);
    expect(deOlivia.totalNoLeidos).toBe(2);
    expect((await service.listarConversaciones("carla")).totalNoLeidos).toBe(1);
    expect((await service.listarConversaciones("camilo")).totalNoLeidos).toBe(0);
  });

  it("sin chats devuelve una lista vacía y total 0", async () => {
    rockConChat.mensajes = [];
    jazzConChat.mensajes = [];

    expect(await service.listarConversaciones("olivia")).toEqual({ totalNoLeidos: 0, conversaciones: [] });
  });

  it("busca las compras del usuario que pide y no de otro", async () => {
    await service.listarConversaciones("carla");

    expect(compraRepository.findByParticipanteId).toHaveBeenCalledWith("carla");
  });

  it("si el usuario ya no existe (servidor reiniciado), pide iniciar sesión de nuevo (401)", async () => {
    await expect(service.listarConversaciones("borrado")).rejects.toThrow(UnauthorizedError);
  });
});
