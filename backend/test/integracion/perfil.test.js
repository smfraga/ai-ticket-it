import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
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

  it("un rechazo no cambia nada", async () => {
    await editar({ nombre: "", apellido: "Nuevo" });

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "carla.perfil@example.com", password: "una-contraseña-larga" });
    expect(login.body.usuario).toMatchObject({ nombre: "Carla María", apellido: "Gómez", roles: ["COMPRADOR"] });
  });
});
