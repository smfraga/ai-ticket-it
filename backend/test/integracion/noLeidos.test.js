import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

const enDias = (dias) => new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

const registrar = async (email, roles) =>
  (
    await request(app)
      .post("/auth/registro")
      .send({ nombre: "Usuario", apellido: "De Prueba", password: "una-contraseña-larga", email, roles })
  ).body.token;

describe("Mensajes no leídos (API completa)", () => {
  let olivia;
  let carla;
  let evento;
  let compra;

  const como = (token) => ({
    get: (ruta) => request(app).get(ruta).set("Authorization", `Bearer ${token}`),
    post: (ruta) => request(app).post(ruta).set("Authorization", `Bearer ${token}`),
  });
  const noLeidosEnLaLista = async (token) =>
    (await como(token).get("/compras")).body.find((c) => c.id === compra.id).mensajesNoLeidos;
  const noLeidosEnElDetalle = async (token) => (await como(token).get(`/compras/${compra.id}`)).body.mensajesNoLeidos;
  const noLeidosDelOrganizador = async () =>
    (await como(olivia).get(`/eventos/${evento.id}/compras`)).body.compras.find((c) => c.id === compra.id)
      .mensajesNoLeidos;

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    const rock = await categoriaRepository.save(new Categoria("Rock", "Bandas en vivo"));
    olivia = await registrar("olivia@example.com", ["ORGANIZADOR"]);
    carla = await registrar("carla@example.com", ["COMPRADOR"]);
    evento = (
      await como(olivia)
        .post("/eventos")
        .send({
          nombre: "Recital",
          categoriaId: rock.id,
          fecha: enDias(30).toISOString(),
          tiposEntrada: [{ nombre: "General", precio: 1000, cupo: 10 }],
        })
    ).body;
    compra = (await como(carla).post(`/eventos/${evento.id}/compras`).send({ tipoEntradaId: evento.tiposEntrada[0].id, cantidad: 1 }))
      .body;
  });

  it("una compra nueva no tiene mensajes nuevos para nadie", async () => {
    expect(compra.mensajesNoLeidos).toBe(0);
    expect(await noLeidosDelOrganizador()).toBe(0);
  });

  it("los mensajes de Carla le aparecen a Olivia como nuevos hasta que abre el chat", async () => {
    await como(carla).post(`/compras/${compra.id}/mensajes`).send({ mensaje: "Hola" });
    await como(carla).post(`/compras/${compra.id}/mensajes`).send({ mensaje: "¿A qué hora abren?" });

    expect(await noLeidosDelOrganizador()).toBe(2);
    expect(await noLeidosEnElDetalle(olivia)).toBe(2);
    expect(await noLeidosEnLaLista(carla)).toBe(0);

    await como(olivia).get(`/compras/${compra.id}/mensajes`);

    expect(await noLeidosDelOrganizador()).toBe(0);
  });

  it("la respuesta de Olivia le aparece a Carla en Mis compras y en el detalle, hasta que lee el chat", async () => {
    await como(olivia).post(`/compras/${compra.id}/mensajes`).send({ mensaje: "Abrimos a las 20" });

    expect(await noLeidosEnLaLista(carla)).toBe(1);
    expect(await noLeidosEnElDetalle(carla)).toBe(1);
    expect(await noLeidosDelOrganizador()).toBe(0);

    await como(carla).get(`/compras/${compra.id}/mensajes`);

    expect(await noLeidosEnLaLista(carla)).toBe(0);
  });
});
