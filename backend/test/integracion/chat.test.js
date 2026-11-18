import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const enDias = (dias) => new Date(Date.now() + dias * MS_POR_DIA);
const ID_INEXISTENTE = "00000000-0000-4000-8000-000000000000";

const registrar = (cambios) =>
  request(app)
    .post("/auth/registro")
    .send({ nombre: "Usuario", apellido: "De Prueba", password: "una-contraseña-larga", ...cambios });

describe("Chat de la compra (API completa)", () => {
  let tokenOlivia;
  let tokenOctavio;
  let tokenCarla;
  let tokenCamilo;
  let evento;
  let general;

  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const escribir = (compraId, token, cuerpo) =>
    request(app).post(`/compras/${compraId}/mensajes`).set(bearer(token)).send(cuerpo);
  const leer = (compraId, token) => request(app).get(`/compras/${compraId}/mensajes`).set(bearer(token));
  const comprar = async () =>
    (
      await request(app)
        .post(`/eventos/${evento.id}/compras`)
        .set(bearer(tokenCarla))
        .send({ tipoEntradaId: general.id, cantidad: 1 })
    ).body;

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    const categoria = await categoriaRepository.save(new Categoria("Rock", "Bandas en vivo"));
    tokenOlivia = (
      await registrar({ email: "olivia@example.com", nombre: "Olivia", apellido: "Rossi", roles: ["ORGANIZADOR"] })
    ).body.token;
    tokenOctavio = (await registrar({ email: "octavio@example.com", roles: ["ORGANIZADOR"] })).body.token;
    tokenCarla = (
      await registrar({ email: "carla@example.com", nombre: "Carla", apellido: "Gómez", roles: ["COMPRADOR"] })
    ).body.token;
    tokenCamilo = (await registrar({ email: "camilo@example.com", roles: ["COMPRADOR"] })).body.token;

    evento = (
      await request(app)
        .post("/eventos")
        .set(bearer(tokenOlivia))
        .send({
          nombre: "Recital de rock",
          categoriaId: categoria.id,
          fecha: enDias(10).toISOString(),
          tiposEntrada: [{ nombre: "General", precio: 10000, cupo: 50 }],
        })
    ).body;
    general = evento.tiposEntrada[0];
  });

  describe("POST /compras/:id/mensajes", () => {
    it("el comprador escribe: 201 con el mensaje y su rol en la compra", async () => {
      const compra = await comprar();

      const respuesta = await escribir(compra.id, tokenCarla, { mensaje: "  ¿A qué hora abren?  " });

      expect(respuesta.status).toBe(201);
      expect(respuesta.body).toMatchObject({
        autor: { nombre: "Carla", apellido: "Gómez", rol: "COMPRADOR" },
        mensaje: "¿A qué hora abren?",
      });
      expect(new Date(respuesta.body.enviado).getTime()).not.toBeNaN();
    });

    it("el organizador del evento responde: 201 con rol ORGANIZADOR", async () => {
      const compra = await comprar();

      const respuesta = await escribir(compra.id, tokenOlivia, { mensaje: "A las 20" });

      expect(respuesta.status).toBe(201);
      expect(respuesta.body.autor).toMatchObject({ nombre: "Olivia", rol: "ORGANIZADOR" });
    });

    it("se puede escribir aunque la compra esté cancelada", async () => {
      const compra = await comprar();
      await request(app).post(`/compras/${compra.id}/cancelar`).set(bearer(tokenCarla));

      const respuesta = await escribir(compra.id, tokenCarla, { mensaje: "Gracias por el reembolso" });

      expect(respuesta.status).toBe(201);
    });

    it("403 si escribe otro comprador u otro organizador, y el chat queda vacío", async () => {
      const compra = await comprar();

      expect((await escribir(compra.id, tokenCamilo, { mensaje: "Hola" })).status).toBe(403);
      expect((await escribir(compra.id, tokenOctavio, { mensaje: "Hola" })).status).toBe(403);
      expect((await leer(compra.id, tokenCarla)).body).toEqual([]);
    });

    it.each([
      ["vacío", { mensaje: "" }],
      ["solo espacios", { mensaje: "   " }],
      ["de más de 500 caracteres", { mensaje: "a".repeat(501) }],
      ["sin el campo mensaje", {}],
      ["con un mensaje que no es texto", { mensaje: 42 }],
      ["con campos de más", { mensaje: "Hola", autor: "otro" }],
    ])("400 si el cuerpo es %s", async (_caso, cuerpo) => {
      const compra = await comprar();

      const respuesta = await escribir(compra.id, tokenCarla, cuerpo);

      expect(respuesta.status).toBe(400);
      expect((await leer(compra.id, tokenCarla)).body).toEqual([]);
    });

    it("acepta un mensaje de exactamente 500 caracteres", async () => {
      const compra = await comprar();

      expect((await escribir(compra.id, tokenCarla, { mensaje: "a".repeat(500) })).status).toBe(201);
    });

    it("404 si la compra no existe", async () => {
      expect((await escribir(ID_INEXISTENTE, tokenCarla, { mensaje: "Hola" })).status).toBe(404);
    });

    it("400 si el id no es UUID", async () => {
      expect((await escribir("abc", tokenCarla, { mensaje: "Hola" })).status).toBe(400);
    });

    it("401 sin token", async () => {
      const compra = await comprar();

      const respuesta = await request(app).post(`/compras/${compra.id}/mensajes`).send({ mensaje: "Hola" });

      expect(respuesta.status).toBe(401);
    });
  });

  describe("GET /compras/:id/mensajes", () => {
    it("el comprador y el organizador leen la conversación completa, en orden y con roles", async () => {
      const compra = await comprar();
      await escribir(compra.id, tokenCarla, { mensaje: "Primero" });
      await escribir(compra.id, tokenOlivia, { mensaje: "Segundo" });
      await escribir(compra.id, tokenCarla, { mensaje: "Tercero" });

      for (const token of [tokenCarla, tokenOlivia]) {
        const respuesta = await leer(compra.id, token);

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.map((m) => [m.mensaje, m.autor.rol])).toEqual([
          ["Primero", "COMPRADOR"],
          ["Segundo", "ORGANIZADOR"],
          ["Tercero", "COMPRADOR"],
        ]);
      }
    });

    it("una compra sin mensajes devuelve una lista vacía", async () => {
      const compra = await comprar();

      const respuesta = await leer(compra.id, tokenCarla);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual([]);
    });

    it("no expone el email ni el hash de los autores", async () => {
      const compra = await comprar();
      await escribir(compra.id, tokenCarla, { mensaje: "Hola" });
      await escribir(compra.id, tokenOlivia, { mensaje: "Hola, Carla" });

      const respuesta = await leer(compra.id, tokenCarla);

      expect(JSON.stringify(respuesta.body)).not.toMatch(/@example.com|passwordHash/);
    });

    it("403 si lee otro comprador u otro organizador", async () => {
      const compra = await comprar();
      await escribir(compra.id, tokenCarla, { mensaje: "Un dato privado" });

      const comoCamilo = await leer(compra.id, tokenCamilo);
      const comoOctavio = await leer(compra.id, tokenOctavio);

      expect(comoCamilo.status).toBe(403);
      expect(comoOctavio.status).toBe(403);
      expect(JSON.stringify([comoCamilo.body, comoOctavio.body])).not.toContain("Un dato privado");
    });

    it("404 si la compra no existe", async () => {
      expect((await leer(ID_INEXISTENTE, tokenCarla)).status).toBe(404);
    });

    it("400 si el id no es UUID", async () => {
      expect((await leer("abc", tokenCarla)).status).toBe(400);
    });

    it("401 sin token", async () => {
      const compra = await comprar();

      expect((await request(app).get(`/compras/${compra.id}/mensajes`)).status).toBe(401);
    });
  });
});
