import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

describe("PATCH /perfil (API completa)", () => {
  let sesion;

  const editar = (datos, token = sesion.token) =>
    request(app).patch("/perfil").set("Authorization", `Bearer ${token}`).send(datos);

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    sesion = (
      await request(app)
        .post("/auth/registro")
        .send({
          nombre: "Carla",
          apellido: "Gómez",
          email: "carla.perfil@example.com",
          password: "una-contraseña-larga",
          roles: ["COMPRADOR"],
        })
    ).body;
  });

  it("sin token responde 401", async () => {
    expect((await request(app).patch("/perfil").send({ nombre: "X" })).status).toBe(401);
  });

  it("cambia nombre y apellido (sin espacios de los bordes) y devuelve el usuario", async () => {
    const respuesta = await editar({ nombre: "  Carla María ", apellido: "Gómez Paz" });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      ...sesion.usuario,
      nombre: "Carla María",
      apellido: "Gómez Paz",
    });
    expect(respuesta.body).not.toHaveProperty("passwordHash");
  });

  it("el cambio se ve en el login siguiente, y el token anterior sigue sirviendo", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ email: "carla.perfil@example.com", password: "una-contraseña-larga" });

    expect(login.body.usuario).toMatchObject({ nombre: "Carla María", apellido: "Gómez Paz" });
    expect((await editar({ apellido: "Gómez" })).status).toBe(200);
  });

  it.each([
    ["un nombre vacío", { nombre: "   " }],
    ["un body vacío", {}],
    ["un nombre de más de 60 caracteres", { nombre: "a".repeat(61) }],
    ["un campo que no se edita (email)", { email: "otro@example.com" }],
    ["un cambio válido junto a un campo que no se edita", { nombre: "Carla", email: "otro@example.com" }],
    ["roles (no se editan)", { roles: ["ORGANIZADOR"] }],
  ])("rechaza %s con 400", async (_, datos) => {
    const respuesta = await editar(datos);

    expect(respuesta.status).toBe(400);
  });

  it("GET /perfil sin token responde 401", async () => {
    expect((await request(app).get("/perfil")).status).toBe(401);
  });

  it("GET /perfil de un comprador nuevo: sus datos, estadísticas en cero, historial vacío y sin parte de organizador", async () => {
    const respuesta = await request(app).get("/perfil").set("Authorization", `Bearer ${sesion.token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario).toMatchObject({ email: "carla.perfil@example.com", roles: ["COMPRADOR"] });
    expect(respuesta.body.comprador).toEqual({
      estadisticas: {
        entradasCompradas: 0,
        totalGastado: 0,
        eventosALosQueFue: 0,
        reseniasDejadas: 0,
        categoriaPreferida: null,
        proximoEvento: null,
      },
      historial: [],
    });
    expect(respuesta.body.organizador).toBeNull();
  });

  it("GET /perfil refleja una compra nueva: entradas, gasto, categoría y próximo evento", async () => {
    const categoria = await categoriaRepository.save(new Categoria("Teatro del perfil", "Obras"));
    const organizador = (
      await request(app)
        .post("/auth/registro")
        .send({
          nombre: "Octavio",
          apellido: "Benítez",
          email: "octavio.perfil@example.com",
          password: "una-contraseña-larga",
          roles: ["ORGANIZADOR"],
        })
    ).body;
    const evento = (
      await request(app)
        .post("/eventos")
        .set("Authorization", `Bearer ${organizador.token}`)
        .send({
          nombre: "Obra del perfil",
          categoriaId: categoria.id,
          fecha: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          tiposEntrada: [{ nombre: "Platea", precio: 2500, cupo: 10 }],
        })
    ).body;
    await request(app)
      .post(`/eventos/${evento.id}/compras`)
      .set("Authorization", `Bearer ${sesion.token}`)
      .send({ tipoEntradaId: evento.tiposEntrada[0].id, cantidad: 2 });

    const deCarla = (await request(app).get("/perfil").set("Authorization", `Bearer ${sesion.token}`)).body;
    const deOctavio = (await request(app).get("/perfil").set("Authorization", `Bearer ${organizador.token}`)).body;

    expect(deCarla.comprador.estadisticas).toMatchObject({
      entradasCompradas: 2,
      totalGastado: 5000,
      categoriaPreferida: "Teatro del perfil",
      proximoEvento: { id: evento.id, nombre: "Obra del perfil" },
    });
    expect(deOctavio.comprador).toBeNull();
    expect(deOctavio.organizador.estadisticas).toMatchObject({
      eventosCreados: { total: 1, proximos: 1, realizados: 0, cancelados: 0 },
      entradasVendidas: 2,
      recaudacion: 5000,
      eventoMasVendido: { evento: expect.objectContaining({ id: evento.id }), entradasVendidas: 2 },
      puntaje: null,
      cantidadResenias: 0,
    });
    expect(deOctavio.organizador.historial).toEqual([]);
  });

  it("un rechazo no cambia nada", async () => {
    await editar({ nombre: "", apellido: "Nuevo" });

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "carla.perfil@example.com", password: "una-contraseña-larga" });
    expect(login.body.usuario).toMatchObject({ nombre: "Carla María", apellido: "Gómez", roles: ["COMPRADOR"] });
  });
});
