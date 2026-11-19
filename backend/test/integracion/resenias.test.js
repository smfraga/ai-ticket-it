import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { usuarioRepository } from "../../repositories/UsuarioRepository.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const enDias = (dias) => new Date(Date.now() + dias * MS_POR_DIA);
const ID_INEXISTENTE = "00000000-0000-4000-8000-000000000000";

const registrar = (cambios) =>
  request(app)
    .post("/auth/registro")
    .send({ nombre: "Usuario", apellido: "De Prueba", password: "una-contraseña-larga", ...cambios });

describe("Reseñas (API completa)", () => {
  let tokenOlivia;
  let tokenOctavio;
  let tokenCarla;
  let tokenCamilo;
  let idOlivia;
  let idCarla;
  let eventoDeOlivia;
  let eventoDeOctavio;

  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const crearEvento = async (token, nombre, categoriaId) =>
    (
      await request(app)
        .post("/eventos")
        .set(bearer(token))
        .send({
          nombre,
          categoriaId,
          fecha: enDias(10).toISOString(),
          tiposEntrada: [{ nombre: "General", precio: 10000, cupo: 50 }],
        })
    ).body;
  const comprar = async (evento, token = tokenCarla) =>
    (
      await request(app)
        .post(`/eventos/${evento.id}/compras`)
        .set(bearer(token))
        .send({ tipoEntradaId: evento.tiposEntrada[0].id, cantidad: 1 })
    ).body;
  // Una compra ya UTILIZADA: la compra el comprador y el organizador del evento la marca.
  const compraUtilizada = async (evento, tokenOrganizador, tokenComprador = tokenCarla) => {
    const compra = await comprar(evento, tokenComprador);
    await request(app).post(`/compras/${compra.id}/utilizar`).set(bearer(tokenOrganizador));
    return compra;
  };
  const resenar = (compraId, token, cuerpo) =>
    request(app).post(`/compras/${compraId}/resenia`).set(bearer(token)).send(cuerpo);

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
    idOlivia = (await usuarioRepository.findByEmail("olivia@example.com")).id;
    idCarla = (await usuarioRepository.findByEmail("carla@example.com")).id;

    eventoDeOlivia = await crearEvento(tokenOlivia, "Recital de rock", categoria.id);
    eventoDeOctavio = await crearEvento(tokenOctavio, "Stand up", categoria.id);
  });

  describe("POST /compras/:id/resenia", () => {
    it("el comprador reseña su compra utilizada: 201 con la reseña, sin datos privados", async () => {
      const compra = await compraUtilizada(eventoDeOlivia, tokenOlivia);

      const respuesta = await resenar(compra.id, tokenCarla, { puntuacion: 5, detalle: "  Impecable  " });

      expect(respuesta.status).toBe(201);
      expect(respuesta.body).toMatchObject({
        puntuacion: 5,
        detalle: "Impecable",
        autor: { id: idCarla, nombre: "Carla", apellido: "Gómez" },
        evento: { id: eventoDeOlivia.id, nombre: "Recital de rock" },
      });
      expect(JSON.stringify(respuesta.body)).not.toMatch(/@example.com|passwordHash/);
    });

    it("409 si la compra ya tiene una reseña", async () => {
      const compra = await compraUtilizada(eventoDeOlivia, tokenOlivia);
      await resenar(compra.id, tokenCarla, { puntuacion: 5, detalle: "Impecable" });

      const respuesta = await resenar(compra.id, tokenCarla, { puntuacion: 1, detalle: "Cambié de idea" });

      expect(respuesta.status).toBe(409);
    });

    it("409 si la compra no está utilizada (CONFIRMADA o cancelada)", async () => {
      const confirmada = await comprar(eventoDeOlivia);
      const cancelada = await comprar(eventoDeOlivia);
      await request(app).post(`/compras/${cancelada.id}/cancelar`).set(bearer(tokenCarla));

      expect((await resenar(confirmada.id, tokenCarla, { puntuacion: 5, detalle: "Bien" })).status).toBe(409);
      expect((await resenar(cancelada.id, tokenCarla, { puntuacion: 5, detalle: "Bien" })).status).toBe(409);
    });

    it("403 si reseña otro comprador o el organizador, y la compra sigue sin reseña", async () => {
      const compra = await compraUtilizada(eventoDeOlivia, tokenOlivia);

      expect((await resenar(compra.id, tokenCamilo, { puntuacion: 1, detalle: "Mal" })).status).toBe(403);
      expect((await resenar(compra.id, tokenOlivia, { puntuacion: 5, detalle: "Genial" })).status).toBe(403);
      expect((await resenar(compra.id, tokenCarla, { puntuacion: 4, detalle: "Bien" })).status).toBe(201);
    });

    it("un ajeno recibe 403 y no 409 aunque la compra ya tenga reseña", async () => {
      const compra = await compraUtilizada(eventoDeOlivia, tokenOlivia);
      await resenar(compra.id, tokenCarla, { puntuacion: 5, detalle: "Impecable" });

      expect((await resenar(compra.id, tokenCamilo, { puntuacion: 1, detalle: "Mal" })).status).toBe(403);
    });

    it.each([
      ["puntuación 0", { puntuacion: 0, detalle: "Bien" }],
      ["puntuación 6", { puntuacion: 6, detalle: "Bien" }],
      ["puntuación decimal", { puntuacion: 3.5, detalle: "Bien" }],
      ["puntuación en texto", { puntuacion: "4", detalle: "Bien" }],
      ["comentario vacío", { puntuacion: 4, detalle: "   " }],
      ["sin comentario", { puntuacion: 4 }],
      ["sin puntuación", { detalle: "Bien" }],
      ["campos de más", { puntuacion: 4, detalle: "Bien", autor: "otro" }],
    ])("400 con %s", async (_caso, cuerpo) => {
      const compra = await compraUtilizada(eventoDeOlivia, tokenOlivia);

      const respuesta = await resenar(compra.id, tokenCarla, cuerpo);

      expect(respuesta.status).toBe(400);
    });

    it("acepta un comentario largo: no tiene límite", async () => {
      const compra = await compraUtilizada(eventoDeOlivia, tokenOlivia);

      const respuesta = await resenar(compra.id, tokenCarla, { puntuacion: 4, detalle: "a".repeat(2000) });

      expect(respuesta.status).toBe(201);
    });

    it("404 si la compra no existe", async () => {
      expect((await resenar(ID_INEXISTENTE, tokenCarla, { puntuacion: 4, detalle: "Bien" })).status).toBe(404);
    });

    it("400 si el id no es UUID", async () => {
      expect((await resenar("abc", tokenCarla, { puntuacion: 4, detalle: "Bien" })).status).toBe(400);
    });

    it("401 sin token", async () => {
      const compra = await compraUtilizada(eventoDeOlivia, tokenOlivia);

      const respuesta = await request(app)
        .post(`/compras/${compra.id}/resenia`)
        .send({ puntuacion: 4, detalle: "Bien" });

      expect(respuesta.status).toBe(401);
    });
  });

  describe("lecturas públicas (sin token)", () => {
    beforeAll(async () => {
      // Se suma una reseña más de otro comprador (Camilo) para que Olivia tenga reseñas de varias personas.
      // Octavio queda sin reseñas.
      const uno = await compraUtilizada(eventoDeOlivia, tokenOlivia, tokenCamilo);
      await resenar(uno.id, tokenCamilo, { puntuacion: 3, detalle: "Estuvo bien, nada más" });
    });

    it("GET /eventos/:id/resenias lista las reseñas del evento con el puntaje del organizador", async () => {
      const respuesta = await request(app).get(`/eventos/${eventoDeOlivia.id}/resenias`);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.evento).toEqual({ id: eventoDeOlivia.id, nombre: "Recital de rock" });
      expect(respuesta.body.organizador).toMatchObject({ id: idOlivia, nombre: "Olivia", apellido: "Rossi" });
      expect(respuesta.body.resenias.length).toBeGreaterThanOrEqual(2);
      const promedio =
        Math.round(
          (respuesta.body.resenias.reduce((t, r) => t + r.puntuacion, 0) / respuesta.body.resenias.length) * 10,
        ) / 10;
      expect(respuesta.body.organizador.puntaje).toBe(promedio);
      expect(JSON.stringify(respuesta.body)).not.toMatch(/@example.com|passwordHash/);
    });

    it("un evento sin reseñas devuelve lista vacía y puntaje null", async () => {
      const respuesta = await request(app).get(`/eventos/${eventoDeOctavio.id}/resenias`);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.resenias).toEqual([]);
      expect(respuesta.body.organizador.puntaje).toBeNull();
    });

    it("GET /organizadores/:id/resenias devuelve el puntaje, la cantidad y las reseñas", async () => {
      const respuesta = await request(app).get(`/organizadores/${idOlivia}/resenias`);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.organizador).toMatchObject({ id: idOlivia, nombre: "Olivia" });
      expect(respuesta.body.organizador.cantidadResenias).toBe(respuesta.body.resenias.length);
      expect(respuesta.body.organizador.puntaje).toBeGreaterThanOrEqual(1);
      expect(respuesta.body.organizador.puntaje).toBeLessThanOrEqual(5);
    });

    it("una reseña nueva cambia el puntaje del organizador, y sale en el evento y en el organizador", async () => {
      const antes = (await request(app).get(`/organizadores/${idOlivia}/resenias`)).body.organizador;
      const compra = await compraUtilizada(eventoDeOlivia, tokenOlivia);

      await resenar(compra.id, tokenCarla, { puntuacion: 1, detalle: "Terrible, nunca más" });

      const despues = (await request(app).get(`/organizadores/${idOlivia}/resenias`)).body;
      const delEvento = (await request(app).get(`/eventos/${eventoDeOlivia.id}/resenias`)).body;
      expect(despues.organizador.cantidadResenias).toBe(antes.cantidadResenias + 1);
      expect(despues.organizador.puntaje).toBeLessThan(antes.puntaje);
      expect(despues.resenias[0].detalle).toBe("Terrible, nunca más");
      expect(delEvento.resenias[0].detalle).toBe("Terrible, nunca más");
    });

    it("el puntaje del organizador no se mezcla con el de otro", async () => {
      const respuesta = await request(app).get(
        `/organizadores/${(await usuarioRepository.findByEmail("octavio@example.com")).id}/resenias`,
      );

      expect(respuesta.body.organizador).toMatchObject({ puntaje: null, cantidadResenias: 0 });
      expect(respuesta.body.resenias).toEqual([]);
    });

    it("404 si el evento o el organizador no existen, o el usuario no es organizador", async () => {
      expect((await request(app).get(`/eventos/${ID_INEXISTENTE}/resenias`)).status).toBe(404);
      expect((await request(app).get(`/organizadores/${ID_INEXISTENTE}/resenias`)).status).toBe(404);
      expect((await request(app).get(`/organizadores/${idCarla}/resenias`)).status).toBe(404);
    });

    it("400 si el id no es UUID", async () => {
      expect((await request(app).get("/eventos/abc/resenias")).status).toBe(400);
      expect((await request(app).get("/organizadores/abc/resenias")).status).toBe(400);
    });
  });
});
