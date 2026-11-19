import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

const enDias = (dias) => new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

const registrar = async (email, nombre, roles) =>
  (
    await request(app)
      .post("/auth/registro")
      .send({ nombre, apellido: "De Prueba", password: "una-contraseña-larga", email, roles })
  ).body.token;

describe("GET /conversaciones (API completa)", () => {
  let olivia;
  let carla;
  let camilo;
  let compraDeCarla;
  let compraDeCamilo;

  const como = (token) => ({
    get: (ruta) => request(app).get(ruta).set("Authorization", `Bearer ${token}`),
    post: (ruta) => request(app).post(ruta).set("Authorization", `Bearer ${token}`),
  });
  const escribir = (token, compra, mensaje) => como(token).post(`/compras/${compra.id}/mensajes`).send({ mensaje });

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    const rock = await categoriaRepository.save(new Categoria("Rock de conversaciones", "Bandas en vivo"));
    olivia = await registrar("olivia.conversaciones@example.com", "Olivia", ["ORGANIZADOR"]);
    carla = await registrar("carla.conversaciones@example.com", "Carla", ["COMPRADOR"]);
    camilo = await registrar("camilo.conversaciones@example.com", "Camilo", ["COMPRADOR"]);
    const evento = (
      await como(olivia)
        .post("/eventos")
        .send({
          nombre: "Recital con chat",
          categoriaId: rock.id,
          fecha: enDias(30).toISOString(),
          tiposEntrada: [{ nombre: "General", precio: 1000, cupo: 10 }],
        })
    ).body;
    const comprar = async (token) =>
      (
        await como(token)
          .post(`/eventos/${evento.id}/compras`)
          .send({ tipoEntradaId: evento.tiposEntrada[0].id, cantidad: 1 })
      ).body;
    compraDeCarla = await comprar(carla);
    compraDeCamilo = await comprar(camilo);
  });

  it("sin token responde 401", async () => {
    const respuesta = await request(app).get("/conversaciones");

    expect(respuesta.status).toBe(401);
  });

  it("las compras sin mensajes no aparecen", async () => {
    const respuesta = await como(olivia).get("/conversaciones");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ totalNoLeidos: 0, conversaciones: [] });
  });

  it("el organizador ve un chat por compra, el último primero, con los mensajes nuevos sumados", async () => {
    await escribir(carla, compraDeCarla, "¿A qué hora abren?");
    await escribir(camilo, compraDeCamilo, "¿Hay guardarropa?");
    await escribir(camilo, compraDeCamilo, "¿Y estacionamiento?");

    const { body } = await como(olivia).get("/conversaciones");

    expect(body.conversaciones.map((c) => c.compraId)).toEqual([compraDeCamilo.id, compraDeCarla.id]);
    expect(body.conversaciones.map((c) => c.noLeidos)).toEqual([2, 1]);
    expect(body.totalNoLeidos).toBe(3);
    expect(body.conversaciones[0].contraparte).toMatchObject({ nombre: "Camilo", rol: "COMPRADOR" });
    expect(body.conversaciones[0].ultimoMensaje).toMatchObject({ texto: "¿Y estacionamiento?", propio: false });
  });

  it("ver la lista no marca nada como leído; abrir un chat sí, y el total baja", async () => {
    await como(olivia).get("/conversaciones");
    expect((await como(olivia).get("/conversaciones")).body.totalNoLeidos).toBe(3);

    await como(olivia).get(`/compras/${compraDeCamilo.id}/mensajes`);

    expect((await como(olivia).get("/conversaciones")).body.totalNoLeidos).toBe(1);
  });

  it("el comprador ve solo su chat, con el organizador como contraparte y la respuesta como nueva", async () => {
    await escribir(olivia, compraDeCarla, "Abrimos a las 20");

    const { body } = await como(carla).get("/conversaciones");

    expect(body.conversaciones).toHaveLength(1);
    expect(body.conversaciones[0]).toMatchObject({
      compraId: compraDeCarla.id,
      evento: { nombre: "Recital con chat", imagen: null, cancelado: false },
      tipoEntrada: { nombre: "General" },
      cantidad: 1,
      contraparte: { nombre: "Olivia", rol: "ORGANIZADOR" },
      ultimoMensaje: { texto: "Abrimos a las 20", propio: false },
      noLeidos: 1,
    });
    expect(body.totalNoLeidos).toBe(1);
  });

  it("al responder, el chat sube al primer lugar de la lista del organizador", async () => {
    const { body } = await como(olivia).get("/conversaciones");

    expect(body.conversaciones[0].compraId).toBe(compraDeCarla.id);
    expect(body.conversaciones[0].ultimoMensaje).toMatchObject({ texto: "Abrimos a las 20", propio: true });
  });
});
