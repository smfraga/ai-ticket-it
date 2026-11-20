import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { rolUsuario } from "../../domain/RolUsuario.js";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "../../errors/AppError.js";
import { EventoService } from "../../services/EventoService.js";
import {
  AHORA,
  crearCategoria,
  crearComprador,
  crearEvento,
  crearOrganizador,
  crearTipoEntrada,
  enDias,
} from "../helpers/domainFactories.js";

const rock = Object.assign(crearCategoria({ nombre: "Rock" }), { id: "c-rock" });
const teatro = Object.assign(crearCategoria({ nombre: "Teatro" }), { id: "c-teatro" });

describe("EventoService", () => {
  let eventoRepository;
  let categoriaRepository;
  let usuarioRepository;
  let resenaRepository;
  let service;

  // Reseñas por organizador: Olivia promedia 4.5, Octavio 3 y Sin Puntaje no tiene.
  const reseniasPorOrganizador = {
    olivia: [{ puntuacion: 5 }, { puntuacion: 4 }],
    octavio: [{ puntuacion: 3 }],
  };

  beforeEach(() => {
    eventoRepository = {
      save: jest.fn(async (evento) => {
        evento.id ??= "evento-nuevo";
        evento.tiposEntrada.forEach((tipo, i) => (tipo.id ??= `tipo-nuevo-${i}`));
        return evento;
      }),
      findById: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
    };
    categoriaRepository = { findById: jest.fn().mockResolvedValue(rock) };
    usuarioRepository = { findById: jest.fn().mockResolvedValue(null) };
    resenaRepository = {
      findByOrganizadorId: jest.fn(async (id) => reseniasPorOrganizador[id] ?? []),
    };
    service = new EventoService(
      eventoRepository,
      categoriaRepository,
      usuarioRepository,
      resenaRepository,
      () => AHORA,
    );
  });

  describe("crear", () => {
    const olivia = crearOrganizador({ id: "olivia", nombre: "Olivia", apellido: "Rossi" });
    const datos = (cambios = {}) => ({
      nombre: "Recital de rock",
      descripcion: "Una noche de rock",
      categoriaId: "c-rock",
      fecha: enDias(30),
      tiposEntrada: [
        { nombre: "General", descripcion: "Campo", precio: 15000, cupo: 100 },
        { nombre: "VIP", precio: 40000, cupo: 20 },
      ],
      multimedia: ["https://example.com/foto.jpg"],
      ...cambios,
    });

    beforeEach(() => {
      usuarioRepository.findById.mockResolvedValue(olivia);
    });

    it("guarda un evento del organizador con sus tipos de entrada y devuelve el evento creado", async () => {
      const respuesta = await service.crear("olivia", datos());

      const guardado = eventoRepository.save.mock.calls[0][0];
      expect(guardado.organizador).toBe(olivia);
      expect(guardado.categoria).toBe(rock);
      expect(guardado.tiposEntrada.map((tipo) => [tipo.nombre, tipo.precio, tipo.cupo])).toEqual([
        ["General", 15000, 100],
        ["VIP", 40000, 20],
      ]);
      expect(respuesta).toEqual({
        id: "evento-nuevo",
        nombre: "Recital de rock",
        descripcion: "Una noche de rock",
        categoria: { id: "c-rock", nombre: "Rock" },
        fecha: enDias(30).toISOString(),
        multimedia: ["https://example.com/foto.jpg"],
        organizador: { id: "olivia", nombre: "Olivia", apellido: "Rossi", foto: null, puntaje: 4.5 },
        precioDesde: 15000,
        yaPaso: false,
        diasParaElEvento: 30,
        cancelado: false,
        tiposEntrada: [
          { id: "tipo-nuevo-0", nombre: "General", descripcion: "Campo", precio: 15000, cupo: 100, disponibles: 100 },
          { id: "tipo-nuevo-1", nombre: "VIP", descripcion: "", precio: 40000, cupo: 20, disponibles: 20 },
        ],
      });
    });

    it("sin descripción ni multimedia, los deja vacíos", async () => {
      const respuesta = await service.crear("olivia", datos({ descripcion: undefined, multimedia: undefined }));

      expect(respuesta.descripcion).toBe("");
      expect(respuesta.multimedia).toEqual([]);
    });

    it("no expone el email ni el hash del organizador", async () => {
      const respuesta = await service.crear("olivia", datos());

      expect(Object.keys(respuesta.organizador).sort()).toEqual(["apellido", "foto", "id", "nombre", "puntaje"]);
      expect(JSON.stringify(respuesta)).not.toContain("passwordHash");
      expect(JSON.stringify(respuesta)).not.toContain(olivia.email);
    });

    it("lanza UnauthorizedError si el usuario del token ya no existe, sin guardar nada", async () => {
      usuarioRepository.findById.mockResolvedValue(null);

      await expect(service.crear("fantasma", datos())).rejects.toThrow(UnauthorizedError);
      await expect(service.crear("fantasma", datos())).rejects.toThrow(
        "La sesión ya no es válida, iniciá sesión de nuevo",
      );
      expect(eventoRepository.save).not.toHaveBeenCalled();
    });

    it("lanza ForbiddenError si el usuario no es organizador, sin guardar nada", async () => {
      usuarioRepository.findById.mockResolvedValue(crearComprador({ id: "carla" }));

      await expect(service.crear("carla", datos())).rejects.toThrow(ForbiddenError);
      expect(eventoRepository.save).not.toHaveBeenCalled();
    });

    it("acepta a un usuario con los dos roles", async () => {
      usuarioRepository.findById.mockResolvedValue(
        Object.assign(crearOrganizador({ id: "mixto" }), {
          roles: [rolUsuario.COMPRADOR, rolUsuario.ORGANIZADOR],
        }),
      );

      await expect(service.crear("mixto", datos())).resolves.toMatchObject({ nombre: "Recital de rock" });
    });

    it("lanza NotFoundError si la categoría no existe, sin guardar nada", async () => {
      categoriaRepository.findById.mockResolvedValue(null);

      await expect(service.crear("olivia", datos({ categoriaId: "c-inexistente" }))).rejects.toThrow(NotFoundError);
      expect(categoriaRepository.findById).toHaveBeenCalledWith("c-inexistente");
      expect(eventoRepository.save).not.toHaveBeenCalled();
    });

    it.each([
      ["en el pasado", () => enDias(-1)],
      ["justo ahora", () => AHORA],
    ])("lanza ValidationError si la fecha es %s, sin guardar nada", async (_, fecha) => {
      await expect(service.crear("olivia", datos({ fecha: fecha() }))).rejects.toThrow(
        "La fecha del evento debe ser futura",
      );
      expect(eventoRepository.save).not.toHaveBeenCalled();
    });

    it("acepta una fecha apenas posterior a ahora", async () => {
      await expect(service.crear("olivia", datos({ fecha: new Date(AHORA.getTime() + 1) }))).resolves.toBeDefined();
    });

    it("propaga el error del dominio si los datos no son válidos, sin guardar nada", async () => {
      const repetidos = datos({
        tiposEntrada: [
          { nombre: "VIP", precio: 1, cupo: 1 },
          { nombre: "vip", precio: 2, cupo: 2 },
        ],
      });

      await expect(service.crear("olivia", repetidos)).rejects.toThrow(ValidationError);
      expect(eventoRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("buscar", () => {
    const olivia = crearOrganizador({ id: "olivia", nombre: "Olivia", apellido: "Rossi" });
    const octavio = crearOrganizador({ id: "octavio", nombre: "Octavio", apellido: "Benítez" });
    const sinPuntaje = crearOrganizador({ id: "sin-puntaje", nombre: "Sol", apellido: "Paz" });

    function evento(id, { nombre, descripcion, categoria, dias, organizador, tipos }) {
      const creado = crearEvento({
        nombre,
        descripcion,
        categoria,
        fecha: enDias(dias),
        organizador,
        tiposEntrada: tipos.map(([nombreTipo, precio]) => crearTipoEntrada({ nombre: nombreTipo, precio })),
      });
      creado.id = id;
      creado.tiposEntrada.forEach((tipo, i) => (tipo.id = `${id}-tipo-${i}`));
      return creado;
    }

    // Próximos: e2 (+5 días), e1 (+10) y e3 (+20). Pasados: e4 (-10) y e5 (-3).
    const e1 = evento("e1", {
      nombre: "Rock en el Parque",
      descripcion: "Bandas nacionales",
      categoria: rock,
      dias: 10,
      organizador: olivia,
      tipos: [
        ["General", 10000],
        ["VIP", 30000],
      ],
    });
    const e2 = evento("e2", {
      nombre: "Obra de teatro Ñoño",
      descripcion: "Comedia para toda la familia",
      categoria: teatro,
      dias: 5,
      organizador: octavio,
      tipos: [["Platea", 8000]],
    });
    const e3 = evento("e3", {
      nombre: "Festival de Jazz",
      descripcion: "Jazz en vivo",
      categoria: rock,
      dias: 20,
      organizador: sinPuntaje,
      tipos: [["Entrada", 20000]],
    });
    const e4 = evento("e4", {
      nombre: "Recital viejo",
      descripcion: "Ya se hizo",
      categoria: rock,
      dias: -10,
      organizador: olivia,
      tipos: [["General", 5000]],
    });
    const e5 = evento("e5", {
      nombre: "Obra vieja",
      descripcion: "Ya se hizo",
      categoria: teatro,
      dias: -3,
      organizador: octavio,
      tipos: [["Platea", 6000]],
    });

    const ids = (eventos) => eventos.map((e) => e.id);

    beforeEach(() => {
      // Orden de carga distinto del de fecha, para comprobar que el service ordena.
      eventoRepository.findAll.mockResolvedValue([e3, e5, e1, e4, e2]);
    });

    describe("período", () => {
      it("por defecto muestra solo los próximos, del más cercano al más lejano", async () => {
        expect(ids(await service.buscar())).toEqual(["e2", "e1", "e3"]);
      });

      it("con periodo=pasados muestra solo los ya realizados", async () => {
        expect(ids(await service.buscar({ periodo: "pasados" }))).toEqual(["e4", "e5"]);
      });

      it("con periodo=todos muestra pasados y próximos", async () => {
        expect(ids(await service.buscar({ periodo: "todos" }))).toEqual(["e4", "e5", "e2", "e1", "e3"]);
      });

      it("un evento que empieza justo ahora ya cuenta como pasado", async () => {
        const ahoraMismo = evento("e6", {
          nombre: "Ahora mismo",
          descripcion: "",
          categoria: rock,
          dias: 0,
          organizador: olivia,
          tipos: [["General", 1]],
        });
        eventoRepository.findAll.mockResolvedValue([ahoraMismo]);

        expect(await service.buscar({ periodo: "proximos" })).toEqual([]);
        expect(ids(await service.buscar({ periodo: "pasados" }))).toEqual(["e6"]);
      });

      it("devuelve una lista vacía si no hay eventos", async () => {
        eventoRepository.findAll.mockResolvedValue([]);

        expect(await service.buscar()).toEqual([]);
      });
    });

    describe("texto", () => {
      it.each([
        ["en el nombre", "rock", ["e1"]],
        ["en la descripción", "BANDAS", ["e1"]],
        ["sin distinguir tildes", "nono", ["e2"]],
        ["con tildes aunque el nombre no las tenga", "música", []],
        ["con varias palabras", "obra familia", ["e2"]],
        ["con un texto que no está", "ópera", []],
        ["con espacios de más", "  jazz  ", ["e3"]],
      ])("busca %s", async (_, texto, esperados) => {
        expect(ids(await service.buscar({ texto }))).toEqual(esperados);
      });

      it("busca también entre los pasados si se pide", async () => {
        expect(ids(await service.buscar({ texto: "ya se hizo", periodo: "pasados" }))).toEqual(["e4", "e5"]);
      });
    });

    describe("categoría", () => {
      it("muestra solo los de esa categoría", async () => {
        expect(ids(await service.buscar({ categoriaId: "c-rock" }))).toEqual(["e1", "e3"]);
        expect(ids(await service.buscar({ categoriaId: "c-teatro" }))).toEqual(["e2"]);
      });

      it("devuelve una lista vacía para una categoría sin eventos", async () => {
        expect(await service.buscar({ categoriaId: "c-otra" })).toEqual([]);
      });
    });

    describe("organizador", () => {
      it("muestra solo los suyos y respeta el período", async () => {
        expect(ids(await service.buscar({ organizadorId: "olivia" }))).toEqual(["e1"]);
        expect(ids(await service.buscar({ organizadorId: "olivia", periodo: "todos" }))).toEqual(["e4", "e1"]);
        expect(ids(await service.buscar({ organizadorId: "octavio", periodo: "pasados" }))).toEqual(["e5"]);
      });

      it("devuelve una lista vacía para un organizador sin eventos", async () => {
        expect(await service.buscar({ organizadorId: "otro", periodo: "todos" })).toEqual([]);
      });
    });

    describe("rango de precio (un evento entra si alguna de sus entradas está en el rango)", () => {
      it.each([
        ["entre los dos extremos", { precioMin: 9000, precioMax: 12000 }, ["e1"]],
        ["con extremos justos", { precioMin: 8000, precioMax: 8000 }, ["e2"]],
        ["solo con mínimo", { precioMin: 25000 }, ["e1"]],
        ["solo con máximo", { precioMax: 8000 }, ["e2"]],
        ["con un rango que abarca todo", { precioMin: 0, precioMax: 100000 }, ["e2", "e1", "e3"]],
        ["con un rango sin eventos", { precioMin: 31000, precioMax: 50000 }, []],
        ["con mínimo 0", { precioMin: 0 }, ["e2", "e1", "e3"]],
      ])("filtra %s", async (_, rango, esperados) => {
        expect(ids(await service.buscar(rango))).toEqual(esperados);
      });
    });

    it("combina texto, categoría y precio", async () => {
      const filtros = { texto: "festival", categoriaId: "c-rock", precioMax: 20000 };

      expect(ids(await service.buscar(filtros))).toEqual(["e3"]);
      expect(ids(await service.buscar({ ...filtros, precioMax: 19999 }))).toEqual([]);
      expect(ids(await service.buscar({ ...filtros, categoriaId: "c-teatro" }))).toEqual([]);
    });

    describe("buscarPaginado (como los listados del TP grupal: { eventos, total, page, totalPages })", () => {
      const pagina = async (page, limit, filtros) => {
        const resultado = await service.buscarPaginado(page, limit, filtros);
        return { ...resultado, eventos: ids(resultado.eventos) };
      };

      it("devuelve la página pedida, el total de eventos que cumplen los filtros y la cantidad de páginas", async () => {
        expect(await pagina(1, 2, { periodo: "todos" })).toEqual({
          eventos: ["e4", "e5"],
          total: 5,
          page: 1,
          totalPages: 3,
        });
      });

      it("cada página sigue donde terminó la anterior, y la última puede venir incompleta", async () => {
        expect((await pagina(2, 2, { periodo: "todos" })).eventos).toEqual(["e2", "e1"]);
        expect((await pagina(3, 2, { periodo: "todos" })).eventos).toEqual(["e3"]);
      });

      it("una página más allá del final viene vacía, con el total igual", async () => {
        expect(await pagina(4, 2, { periodo: "todos" })).toEqual({ eventos: [], total: 5, page: 4, totalPages: 3 });
      });

      it("pagina sobre el resultado ya filtrado y ordenado", async () => {
        expect((await pagina(1, 2, { orden: "precio", direccion: "desc" })).eventos).toEqual(["e3", "e1"]);
        expect(await pagina(2, 1, { texto: "obra", periodo: "todos" })).toEqual({
          eventos: ["e2"],
          total: 2,
          page: 2,
          totalPages: 2,
        });
      });

      it("sin eventos, el total es 0 y no hay páginas", async () => {
        eventoRepository.findAll.mockResolvedValue([]);
        expect(await pagina(1, 20)).toEqual({ eventos: [], total: 0, page: 1, totalPages: 0 });
      });

      it("por defecto, la página 1 de a 20", async () => {
        const muchos = Array.from({ length: 21 }, (_, i) =>
          evento(`m${i}`, {
            nombre: `Evento ${i}`,
            categoria: rock,
            dias: i + 1,
            organizador: olivia,
            tipos: [["General", 1000]],
          }),
        );
        eventoRepository.findAll.mockResolvedValue(muchos);

        const resultado = await service.buscarPaginado();

        expect(resultado).toMatchObject({ page: 1, total: 21, totalPages: 2 });
        expect(resultado.eventos).toHaveLength(20);
      });
    });

    describe("orden", () => {
      it.each([
        ["fecha ascendente", { orden: "fecha" }, ["e2", "e1", "e3"]],
        ["fecha descendente", { orden: "fecha", direccion: "desc" }, ["e3", "e1", "e2"]],
        ["precio ascendente", { orden: "precio" }, ["e2", "e1", "e3"]],
        ["precio descendente", { orden: "precio", direccion: "desc" }, ["e3", "e1", "e2"]],
      ])("ordena por %s", async (_, filtros, esperados) => {
        expect(ids(await service.buscar(filtros))).toEqual(esperados);
      });

      it("el precio para ordenar es el de la entrada más barata", async () => {
        // e1 tiene General $10000 y VIP $30000: su lugar lo da el $10000.
        const respuesta = await service.buscar({ orden: "precio" });

        expect(respuesta.map((e) => e.precioDesde)).toEqual([8000, 10000, 20000]);
      });

      it("por puntaje del organizador, de mayor a menor por defecto, con los sin puntaje al final", async () => {
        expect(ids(await service.buscar({ orden: "puntaje" }))).toEqual(["e1", "e2", "e3"]);
      });

      it("por puntaje ascendente, los sin puntaje siguen al final", async () => {
        expect(ids(await service.buscar({ orden: "puntaje", direccion: "asc" }))).toEqual(["e2", "e1", "e3"]);
      });

      it("por puntaje descendente explícito da lo mismo que el valor por defecto", async () => {
        expect(ids(await service.buscar({ orden: "puntaje", direccion: "desc" }))).toEqual(["e1", "e2", "e3"]);
      });

      it("con el mismo puntaje desempata por fecha, sin importar el sentido", async () => {
        const todos = { periodo: "todos", orden: "puntaje" };

        // Olivia (4.5): e4 (-10) antes que e1 (+10). Octavio (3): e5 (-3) antes que e2 (+5).
        expect(ids(await service.buscar(todos))).toEqual(["e4", "e1", "e5", "e2", "e3"]);
        expect(ids(await service.buscar({ ...todos, direccion: "asc" }))).toEqual(["e5", "e2", "e4", "e1", "e3"]);
      });

      it("con el mismo precio y la misma fecha desempata por nombre", async () => {
        const a = evento("a", {
          nombre: "Árbol",
          descripcion: "",
          categoria: rock,
          dias: 7,
          organizador: olivia,
          tipos: [["G", 100]],
        });
        const b = evento("b", {
          nombre: "Bosque",
          descripcion: "",
          categoria: rock,
          dias: 7,
          organizador: olivia,
          tipos: [["G", 100]],
        });
        eventoRepository.findAll.mockResolvedValue([b, a]);

        expect(ids(await service.buscar({ orden: "precio" }))).toEqual(["a", "b"]);
        expect(ids(await service.buscar({ orden: "precio", direccion: "desc" }))).toEqual(["a", "b"]);
      });

      it("ordena después de filtrar", async () => {
        expect(ids(await service.buscar({ categoriaId: "c-rock", orden: "precio", direccion: "desc" }))).toEqual([
          "e3",
          "e1",
        ]);
      });
    });

    describe("puntaje del organizador", () => {
      it("cada evento trae el puntaje de su organizador (null si no tiene reseñas)", async () => {
        const respuesta = await service.buscar();

        expect(respuesta.map((e) => [e.id, e.organizador.puntaje])).toEqual([
          ["e2", 3],
          ["e1", 4.5],
          ["e3", null],
        ]);
      });

      it("lo calcula una sola vez por organizador aunque tenga varios eventos", async () => {
        await service.buscar({ periodo: "todos" });

        expect(resenaRepository.findByOrganizadorId).toHaveBeenCalledTimes(3);
        expect(resenaRepository.findByOrganizadorId).toHaveBeenCalledWith("olivia");
        expect(resenaRepository.findByOrganizadorId).toHaveBeenCalledWith("octavio");
        expect(resenaRepository.findByOrganizadorId).toHaveBeenCalledWith("sin-puntaje");
      });
    });

    it("cada evento de la lista tiene la forma de la respuesta, con los lugares disponibles", async () => {
      e1.tiposEntrada[0].reservar(4);

      const [, respuesta] = await service.buscar();

      expect(respuesta).toEqual({
        id: "e1",
        nombre: "Rock en el Parque",
        descripcion: "Bandas nacionales",
        categoria: { id: "c-rock", nombre: "Rock" },
        fecha: enDias(10).toISOString(),
        multimedia: [],
        organizador: { id: "olivia", nombre: "Olivia", apellido: "Rossi", foto: null, puntaje: 4.5 },
        precioDesde: 10000,
        yaPaso: false,
        diasParaElEvento: 10,
        cancelado: false,
        tiposEntrada: [
          {
            id: "e1-tipo-0",
            nombre: "General",
            descripcion: "Entrada de prueba",
            precio: 10000,
            cupo: 100,
            disponibles: 96,
          },
          {
            id: "e1-tipo-1",
            nombre: "VIP",
            descripcion: "Entrada de prueba",
            precio: 30000,
            cupo: 100,
            disponibles: 100,
          },
        ],
      });
      e1.tiposEntrada[0].liberar(4);
    });

    it("marca yaPaso en los eventos ya realizados, sin días para el evento", async () => {
      const [pasado] = await service.buscar({ periodo: "pasados" });

      expect(pasado.yaPaso).toBe(true);
      expect(pasado.diasParaElEvento).toBeNull();
    });

    it("no modifica la lista que devuelve el repositorio", async () => {
      const original = [e3, e5, e1, e4, e2];
      eventoRepository.findAll.mockResolvedValue(original);

      await service.buscar({ periodo: "todos", orden: "precio" });

      expect(original).toEqual([e3, e5, e1, e4, e2]);
    });
  });

  describe("getById", () => {
    it("devuelve el evento con su organizador, puntaje y entradas disponibles", async () => {
      const olivia = crearOrganizador({ id: "olivia", nombre: "Olivia", apellido: "Rossi" });
      const guardado = crearEvento({ organizador: olivia, categoria: rock, fecha: enDias(15) });
      guardado.id = "e-1";
      guardado.tiposEntrada.forEach((tipo, i) => (tipo.id = `t-${i}`));
      eventoRepository.findById.mockResolvedValue(guardado);

      const respuesta = await service.getById("e-1");

      expect(eventoRepository.findById).toHaveBeenCalledWith("e-1");
      expect(respuesta).toMatchObject({
        id: "e-1",
        organizador: { id: "olivia", puntaje: 4.5 },
        categoria: { id: "c-rock", nombre: "Rock" },
        yaPaso: false,
        diasParaElEvento: 15,
      });
      expect(respuesta.tiposEntrada.map((t) => t.id)).toEqual(["t-0", "t-1"]);
    });

    it("devuelve también un evento ya realizado, para poder ver sus reseñas", async () => {
      const pasado = crearEvento({ fecha: enDias(-20) });
      pasado.id = "e-viejo";
      eventoRepository.findById.mockResolvedValue(pasado);

      expect((await service.getById("e-viejo")).yaPaso).toBe(true);
    });

    it("lanza NotFoundError si el evento no existe", async () => {
      await expect(service.getById("no-existe")).rejects.toThrow(NotFoundError);
      await expect(service.getById("no-existe")).rejects.toThrow("El evento no existe");
      expect(resenaRepository.findByOrganizadorId).not.toHaveBeenCalled();
    });
  });
});
