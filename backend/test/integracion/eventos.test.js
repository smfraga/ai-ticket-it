import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { Evento } from "../../domain/Evento.js";
import { TipoEntrada } from "../../domain/TipoEntrada.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { eventoRepository } from "../../repositories/EventoRepository.js";
import { usuarioRepository } from "../../repositories/UsuarioRepository.js";
import { SECRETO_DE_PRUEBA, comoOrganizador } from "../helpers/sesion.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const enDias = (dias) => new Date(Date.now() + dias * MS_POR_DIA);
const ID_INEXISTENTE = "00000000-0000-4000-8000-000000000000";

const registrar = (cambios) =>
  request(app)
    .post("/auth/registro")
    .send({
      nombre: "Usuario",
      apellido: "De Prueba",
      password: "una-contraseña-larga",
      ...cambios,
    });

describe("Eventos (API completa)", () => {
  let rock;
  let teatro;
  let tokenOrganizador;
  let tokenComprador;

  const eventoNuevo = (cambios = {}) => ({
    nombre: "Recital de rock",
    descripcion: "Una noche de rock nacional",
    categoriaId: rock.id,
    fecha: enDias(30).toISOString(),
    tiposEntrada: [
      { nombre: "General", descripcion: "Campo", precio: 15000, cupo: 100 },
      { nombre: "VIP", precio: 40000, cupo: 20 },
    ],
    ...cambios,
  });

  const crearEvento = (cambios, token = tokenOrganizador) =>
    request(app).post("/eventos").set("Authorization", `Bearer ${token}`).send(eventoNuevo(cambios));

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    rock = await categoriaRepository.save(new Categoria("Rock", "Bandas en vivo"));
    teatro = await categoriaRepository.save(new Categoria("Teatro", "Obras"));
    tokenOrganizador = (await registrar({ email: "olivia@example.com", roles: ["ORGANIZADOR"] })).body.token;
    tokenComprador = (await registrar({ email: "carla@example.com", roles: ["COMPRADOR"] })).body.token;
  });

  describe("POST /eventos", () => {
    it("un organizador crea un evento y recibe 201 con ids, entradas disponibles y su puntaje", async () => {
      const respuesta = await crearEvento();

      expect(respuesta.status).toBe(201);
      expect(respuesta.body).toMatchObject({
        id: expect.any(String),
        nombre: "Recital de rock",
        categoria: { id: rock.id, nombre: "Rock" },
        organizador: { nombre: "Usuario", apellido: "De Prueba", puntaje: null },
        precioDesde: 15000,
        yaPaso: false,
      });
      expect(respuesta.body.tiposEntrada).toEqual([
        expect.objectContaining({ id: expect.any(String), nombre: "General", cupo: 100, disponibles: 100 }),
        expect.objectContaining({ id: expect.any(String), nombre: "VIP", cupo: 20, disponibles: 20 }),
      ]);
      expect(respuesta.body.tiposEntrada[0].id).not.toBe(respuesta.body.tiposEntrada[1].id);
      expect(JSON.stringify(respuesta.body)).not.toMatch(/passwordHash|olivia@example\.com/);
    });

    it("el evento creado se puede ver enseguida en el detalle y en el catálogo", async () => {
      const creado = (await crearEvento({ nombre: "Evento para ver enseguida" })).body;

      const detalle = await request(app).get(`/eventos/${creado.id}`);
      const catalogo = await request(app).get("/eventos").query({ texto: "para ver enseguida" });

      expect(detalle.body).toEqual(creado);
      expect(catalogo.body).toEqual([creado]);
    });

    it("responde 401 sin token", async () => {
      const respuesta = await request(app).post("/eventos").send(eventoNuevo());

      expect(respuesta.status).toBe(401);
      expect(respuesta.body.message).toBe("Falta el token de sesión");
    });

    it("responde 401 con un token inválido", async () => {
      const respuesta = await request(app)
        .post("/eventos")
        .set("Authorization", "Bearer falso")
        .send(eventoNuevo());

      expect(respuesta.status).toBe(401);
    });

    it("responde 401 si el token es de un usuario que ya no existe (por ejemplo, tras reiniciar el servidor)", async () => {
      const respuesta = await request(app)
        .post("/eventos")
        .set("Authorization", comoOrganizador("usuario-que-no-existe"))
        .send(eventoNuevo());

      expect(respuesta.status).toBe(401);
      expect(respuesta.body.message).toBe("La sesión ya no es válida, iniciá sesión de nuevo");
    });

    it("responde 403 si el usuario es solo comprador, y no crea el evento", async () => {
      const antes = (await eventoRepository.findAll()).length;

      const respuesta = await crearEvento({}, tokenComprador);

      expect(respuesta.status).toBe(403);
      expect(respuesta.body.message).toBe("Solo un usuario organizador puede crear eventos");
      expect((await eventoRepository.findAll()).length).toBe(antes);
    });

    it("un usuario con los dos roles también puede crear eventos", async () => {
      const token = (await registrar({ email: "mixto@example.com", roles: ["COMPRADOR", "ORGANIZADOR"] })).body.token;

      expect((await crearEvento({}, token)).status).toBe(201);
    });

    it.each([
      ["sin nombre", { nombre: "" }],
      ["sin tipos de entrada", { tiposEntrada: [] }],
      ["con un cupo de 0", { tiposEntrada: [{ nombre: "General", precio: 100, cupo: 0 }] }],
      ["con un precio negativo", { tiposEntrada: [{ nombre: "General", precio: -1, cupo: 10 }] }],
      ["con una categoría que no es UUID", { categoriaId: "123" }],
      ["con una fecha sin formato ISO", { fecha: "20/12/2026" }],
      ["con un campo de más", { organizadorId: "otro" }],
    ])("responde 400 con el detalle si el evento viene %s", async (_, cambios) => {
      const respuesta = await crearEvento(cambios);

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.status).toBe("fail");
      expect(respuesta.body.details).toEqual(expect.any(Array));
    });

    it("responde 400 si los nombres de los tipos de entrada se repiten", async () => {
      const respuesta = await crearEvento({
        tiposEntrada: [
          { nombre: "VIP", precio: 100, cupo: 10 },
          { nombre: "vip", precio: 200, cupo: 10 },
        ],
      });

      expect(respuesta.status).toBe(400);
    });

    it("responde 400 si la fecha ya pasó", async () => {
      const respuesta = await crearEvento({ fecha: enDias(-1).toISOString() });

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.message).toBe("La fecha del evento debe ser futura");
    });

    it("responde 404 si la categoría no existe", async () => {
      const respuesta = await crearEvento({ categoriaId: ID_INEXISTENTE });

      expect(respuesta.status).toBe(404);
      expect(respuesta.body.message).toBe("La categoría no existe");
    });
  });

  describe("GET /eventos (catálogo público)", () => {
    beforeAll(async () => {
      await crearEvento({
        nombre: "Obra Ñandú del catálogo",
        descripcion: "Teatro para chicos",
        categoriaId: teatro.id,
        fecha: enDias(3).toISOString(),
        tiposEntrada: [{ nombre: "Platea", precio: 5000, cupo: 50 }],
      });
      await crearEvento({
        nombre: "Festival del catálogo",
        categoriaId: rock.id,
        fecha: enDias(60).toISOString(),
        tiposEntrada: [{ nombre: "Entrada", precio: 25000, cupo: 500 }],
      });
      const organizador = await usuarioRepository.findByEmail("olivia@example.com");
      await eventoRepository.save(
        new Evento(
          "Concierto del catálogo ya realizado",
          "Pasó el mes pasado",
          rock,
          enDias(-30),
          organizador,
          [new TipoEntrada("General", "", 7000, 80)],
        ),
      );
    });

    const nombres = (respuesta) => respuesta.body.map((evento) => evento.nombre);
    const delCatalogo = (query) => request(app).get("/eventos").query({ texto: "catálogo", ...query });

    it("no pide token", async () => {
      expect((await request(app).get("/eventos")).status).toBe(200);
    });

    it("por defecto muestra solo los eventos próximos, del más cercano al más lejano", async () => {
      const respuesta = await delCatalogo();

      expect(respuesta.status).toBe(200);
      expect(nombres(respuesta)).toEqual(["Obra Ñandú del catálogo", "Festival del catálogo"]);
    });

    it("con periodo=pasados muestra los ya realizados, y con todos muestra ambos", async () => {
      expect(nombres(await delCatalogo({ periodo: "pasados" }))).toEqual(["Concierto del catálogo ya realizado"]);
      expect(nombres(await delCatalogo({ periodo: "todos" }))).toEqual([
        "Concierto del catálogo ya realizado",
        "Obra Ñandú del catálogo",
        "Festival del catálogo",
      ]);
    });

    it("busca por texto sin distinguir mayúsculas ni tildes", async () => {
      expect(nombres(await request(app).get("/eventos").query({ texto: "NANDU" }))).toEqual([
        "Obra Ñandú del catálogo",
      ]);
      expect(nombres(await request(app).get("/eventos").query({ texto: "teatro chicos" }))).toEqual([
        "Obra Ñandú del catálogo",
      ]);
    });

    it("filtra por categoría", async () => {
      expect(nombres(await delCatalogo({ categoriaId: teatro.id }))).toEqual(["Obra Ñandú del catálogo"]);
      expect(await delCatalogo({ categoriaId: ID_INEXISTENTE }).then((r) => r.body)).toEqual([]);
    });

    it("filtra por organizador: cada uno ve solo los suyos, pasados incluidos si se pide", async () => {
      const olivia = await usuarioRepository.findByEmail("olivia@example.com");
      const tokenOctavio = (await registrar({ email: "octavio@example.com", roles: ["ORGANIZADOR"] })).body.token;
      await crearEvento({ nombre: "Peña de otro organizador", fecha: enDias(10).toISOString() }, tokenOctavio);
      const octavio = await usuarioRepository.findByEmail("octavio@example.com");

      const deOctavio = await request(app).get("/eventos").query({ organizadorId: octavio.id, periodo: "todos" });
      expect(deOctavio.status).toBe(200);
      expect(nombres(deOctavio)).toEqual(["Peña de otro organizador"]);

      const deOlivia = await delCatalogo({ organizadorId: olivia.id, periodo: "todos" });
      expect(nombres(deOlivia)).toEqual([
        "Concierto del catálogo ya realizado",
        "Obra Ñandú del catálogo",
        "Festival del catálogo",
      ]);
      expect(deOlivia.body.every((evento) => evento.organizador.id === olivia.id)).toBe(true);

      expect(await request(app).get("/eventos").query({ organizadorId: ID_INEXISTENTE }).then((r) => r.body)).toEqual(
        [],
      );
    });

    it("filtra por rango de precio", async () => {
      expect(nombres(await delCatalogo({ precioMin: 20000 }))).toEqual(["Festival del catálogo"]);
      expect(nombres(await delCatalogo({ precioMax: 6000 }))).toEqual(["Obra Ñandú del catálogo"]);
      expect(nombres(await delCatalogo({ precioMin: 6000, precioMax: 24000 }))).toEqual([]);
    });

    it("ordena por precio y por fecha, en las dos direcciones", async () => {
      expect(nombres(await delCatalogo({ orden: "precio", direccion: "desc" }))).toEqual([
        "Festival del catálogo",
        "Obra Ñandú del catálogo",
      ]);
      expect(nombres(await delCatalogo({ orden: "fecha", direccion: "desc" }))).toEqual([
        "Festival del catálogo",
        "Obra Ñandú del catálogo",
      ]);
    });

    it("ordena por puntaje: los organizadores sin reseñas quedan al final pero se muestran", async () => {
      const respuesta = await delCatalogo({ orden: "puntaje" });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.map((evento) => evento.organizador.puntaje)).toEqual([null, null]);
    });

    it.each([
      ["un orden desconocido", { orden: "nombre" }],
      ["un período desconocido", { periodo: "futuros" }],
      ["un rango de precios invertido", { precioMin: 100, precioMax: 10 }],
      ["una categoría que no es UUID", { categoriaId: "rock" }],
      ["un organizador que no es UUID", { organizadorId: "olivia" }],
      ["un precio que no es número", { precioMax: "barato" }],
      ["un parámetro que no existe", { pagina: 2 }],
    ])("responde 400 con el detalle si la query trae %s", async (_, query) => {
      const respuesta = await request(app).get("/eventos").query(query);

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.message).toBe("Los parámetros de la query son inválidos");
      expect(respuesta.body.details).toEqual(expect.any(Array));
    });
  });

  describe("GET /eventos/:id", () => {
    it("devuelve el detalle del evento, sin pedir token", async () => {
      const creado = (await crearEvento({ nombre: "Evento de detalle" })).body;

      const respuesta = await request(app).get(`/eventos/${creado.id}`);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.nombre).toBe("Evento de detalle");
      expect(respuesta.body.tiposEntrada).toHaveLength(2);
    });

    it("también devuelve un evento ya realizado", async () => {
      const [pasado] = (await request(app).get("/eventos").query({ periodo: "pasados" })).body;

      const respuesta = await request(app).get(`/eventos/${pasado.id}`);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.yaPaso).toBe(true);
    });

    it("responde 404 si el evento no existe", async () => {
      const respuesta = await request(app).get(`/eventos/${ID_INEXISTENTE}`);

      expect(respuesta.status).toBe(404);
      expect(respuesta.body.message).toBe("El evento no existe");
    });

    it("responde 400 si el id no es un UUID", async () => {
      const respuesta = await request(app).get("/eventos/123");

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.message).toBe("El parámetro id debe ser un UUID válido");
    });
  });

  describe("GET /categorias", () => {
    it("lista las categorías ordenadas por nombre, sin pedir token", async () => {
      const respuesta = await request(app).get("/categorias");

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual([
        { id: rock.id, nombre: "Rock", descripcion: "Bandas en vivo" },
        { id: teatro.id, nombre: "Teatro", descripcion: "Obras" },
      ]);
    });
  });
});
