import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import { UnauthorizedError } from "../../errors/AppError.js";
import { PerfilService } from "../../services/PerfilService.js";
import {
  AHORA,
  crearCategoria,
  crearComprador,
  crearCompraEn,
  crearEvento,
  crearOrganizador,
  crearTipoEntrada,
  crearUsuario,
  enDias,
} from "../helpers/domainFactories.js";

const { CONFIRMADA, UTILIZADA } = estadoCompra;

describe("PerfilService.obtener", () => {
  let olivia;
  let carla;
  let ambos;
  let rock;
  let jazz;
  let compraRock;
  let compraJazz;
  let repositorios;
  let service;

  beforeEach(() => {
    olivia = crearOrganizador({ id: "olivia", nombre: "Olivia" });
    carla = crearComprador({ id: "carla", nombre: "Carla", email: "carla@example.com" });
    ambos = crearUsuario({ id: "ambos", roles: ["COMPRADOR", "ORGANIZADOR"] });
    const recitales = crearCategoria({ nombre: "Recitales" });
    const tipo = () => [crearTipoEntrada({ precio: 1000, cupo: 10 })];
    // Con el reloj del service en 15 días, el rock (a 10) ya pasó y el jazz (a 30) no.
    rock = crearEvento({ organizador: olivia, categoria: recitales, fecha: enDias(10), tiposEntrada: tipo() });
    rock.id = "rock";
    rock.multimedia = ["https://ejemplo.com/rock.jpg"];
    jazz = crearEvento({ organizador: olivia, categoria: recitales, fecha: enDias(30), tiposEntrada: tipo() });
    jazz.id = "jazz";
    compraRock = crearCompraEn(UTILIZADA, { evento: rock, comprador: carla, cantidad: 2 });
    compraRock.id = "compra-rock";
    compraJazz = crearCompraEn(CONFIRMADA, { evento: jazz, comprador: carla, cantidad: 1 });
    compraJazz.id = "compra-jazz";

    const usuarios = { olivia, carla, ambos };
    const compras = [compraRock, compraJazz];
    repositorios = {
      usuarios: { findById: jest.fn(async (id) => usuarios[id] ?? null) },
      compras: {
        findByCompradorId: jest.fn(async (id) => compras.filter((c) => c.comprador.id === id)),
        findByEventoId: jest.fn(async (id) => compras.filter((c) => c.evento.id === id)),
      },
      eventos: { findAll: jest.fn(async () => [rock, jazz]) },
      resenias: {
        findByCompradorId: jest.fn(async (id) => (id === "carla" ? [{ puntuacion: 5 }] : [])),
        findByOrganizadorId: jest.fn(async (id) => (id === "olivia" ? [{ puntuacion: 5 }, { puntuacion: 4 }] : [])),
      },
    };
    service = new PerfilService(
      repositorios.usuarios,
      repositorios.compras,
      repositorios.eventos,
      repositorios.resenias,
      () => enDias(15, AHORA),
    );
  });

  it("un comprador recibe sus datos, sus estadísticas y su historial; organizador va en null", async () => {
    const perfil = await service.obtener("carla");

    expect(perfil.usuario).toMatchObject({ id: "carla", nombre: "Carla", email: "carla@example.com" });
    expect(perfil.usuario).not.toHaveProperty("passwordHash");
    expect(perfil.organizador).toBeNull();
    expect(perfil.comprador.estadisticas).toEqual({
      entradasCompradas: 3,
      totalGastado: 3000,
      eventosALosQueFue: 1,
      reseniasDejadas: 1,
      categoriaPreferida: "Recitales",
      proximoEvento: {
        id: "jazz",
        nombre: jazz.nombre,
        fecha: jazz.fecha.toISOString(),
        imagen: null,
        categoria: "Recitales",
      },
    });
    expect(perfil.comprador.historial).toEqual([
      {
        evento: {
          id: "rock",
          nombre: rock.nombre,
          fecha: rock.fecha.toISOString(),
          imagen: "https://ejemplo.com/rock.jpg",
          categoria: "Recitales",
        },
        compras: [{ id: "compra-rock", cantidad: 2, total: 2000, tipoEntrada: { nombre: "General" } }],
      },
    ]);
  });

  it("un organizador recibe las estadísticas e historial de sus eventos; comprador va en null", async () => {
    const perfil = await service.obtener("olivia");

    expect(perfil.comprador).toBeNull();
    expect(perfil.organizador.estadisticas).toEqual({
      eventosCreados: { total: 2, proximos: 1, realizados: 1, cancelados: 0 },
      entradasVendidas: 3,
      recaudacion: 3000,
      eventoMasVendido: { evento: expect.objectContaining({ id: "rock" }), entradasVendidas: 2 },
      puntaje: 4.5,
      cantidadResenias: 2,
    });
    expect(perfil.organizador.historial).toEqual([
      { evento: expect.objectContaining({ id: "rock" }), entradasVendidas: 2, recaudacion: 2000 },
    ]);
  });

  it("solo cuenta los eventos de ese organizador", async () => {
    const perfil = await service.obtener("ambos");

    expect(perfil.organizador.estadisticas.eventosCreados.total).toBe(0);
    expect(repositorios.compras.findByEventoId).not.toHaveBeenCalled();
  });

  it("quien tiene los dos roles recibe las dos partes", async () => {
    const perfil = await service.obtener("ambos");

    expect(perfil.comprador).not.toBeNull();
    expect(perfil.organizador).not.toBeNull();
  });

  it("si el usuario del token ya no existe (servidor reiniciado), pide iniciar sesión de nuevo (401)", async () => {
    await expect(service.obtener("borrado")).rejects.toThrow(UnauthorizedError);
  });
});
