import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { Evento } from "../../domain/Evento.js";
import { TipoEntrada } from "../../domain/TipoEntrada.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { eventoRepository } from "../../repositories/EventoRepository.js";
import { usuarioRepository } from "../../repositories/UsuarioRepository.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const enDias = (dias) => new Date(Date.now() + dias * MS_POR_DIA);
const ID_INEXISTENTE = "00000000-0000-4000-8000-000000000000";

const registrar = (cambios) =>
  request(app)
    .post("/auth/registro")
    .send({ nombre: "Usuario", apellido: "De Prueba", password: "una-contraseña-larga", ...cambios });

describe("Favoritos (API completa)", () => {
  let tokenOlivia;
  let tokenCarla;
  let tokenCamilo;
  let tokenAmbos;
  let rock;
  let jazz;
  let obraPasada;

  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const guardar = (eventoId, token) => request(app).post(`/eventos/${eventoId}/favorito`).set(bearer(token));
  const quitar = (eventoId, token) => request(app).delete(`/eventos/${eventoId}/favorito`).set(bearer(token));
  const lista = async (token) => (await request(app).get("/favoritos").set(bearer(token))).body;
  const crearEvento = async (nombre, dias) =>
    (
      await request(app)
        .post("/eventos")
        .set(bearer(tokenOlivia))
        .send({
          nombre,
          categoriaId: (await categoriaRepository.findAll())[0].id,
          fecha: enDias(dias).toISOString(),
          tiposEntrada: [{ nombre: "General", precio: 10000, cupo: 50 }],
        })
    ).body;

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    await categoriaRepository.save(new Categoria("Rock", "Bandas en vivo"));
    tokenOlivia = (
      await registrar({ email: "olivia@example.com", nombre: "Olivia", apellido: "Rossi", roles: ["ORGANIZADOR"] })
    ).body.token;
    tokenCarla = (await registrar({ email: "carla@example.com", roles: ["COMPRADOR"] })).body.token;
    tokenCamilo = (await registrar({ email: "camilo@example.com", roles: ["COMPRADOR"] })).body.token;
    tokenAmbos = (await registrar({ email: "ambos@example.com", roles: ["COMPRADOR", "ORGANIZADOR"] })).body.token;

    rock = await crearEvento("Recital de rock", 10);
    jazz = await crearEvento("Festival de jazz", 30);

    // Un evento ya realizado: la API no deja crearlo, así que se guarda directo en el repositorio.
    const olivia = await usuarioRepository.findByEmail("olivia@example.com");
    const categoria = (await categoriaRepository.findAll())[0];
    obraPasada = await eventoRepository.save(
      new Evento("Obra ya realizada", "", categoria, enDias(-5), olivia, [new TipoEntrada("Platea", "", 7000, 100)]),
    );
  });

  describe("POST /eventos/:id/favorito", () => {
    it("un comprador guarda un evento: 201 con el evento en el formato del catálogo", async () => {
      const respuesta = await guardar(rock.id, tokenCarla);

      expect(respuesta.status).toBe(201);
      expect(respuesta.body).toMatchObject({
        id: rock.id,
        nombre: "Recital de rock",
        yaPaso: false,
        precioDesde: 10000,
        organizador: { nombre: "Olivia" },
      });
      expect(respuesta.body.tiposEntrada[0]).toMatchObject({ nombre: "General", disponibles: 50 });
      expect(JSON.stringify(respuesta.body)).not.toMatch(/@example.com|passwordHash/);
    });

    it("guardarlo otra vez no da error: 200 y no se duplica", async () => {
      await guardar(jazz.id, tokenCamilo);

      const repetido = await guardar(jazz.id, tokenCamilo);

      expect(repetido.status).toBe(200);
      expect(repetido.body.id).toBe(jazz.id);
      expect((await lista(tokenCamilo)).filter((e) => e.id === jazz.id)).toHaveLength(1);
    });

    it("se puede guardar un evento ya realizado", async () => {
      const respuesta = await guardar(obraPasada.id, tokenAmbos);

      expect(respuesta.status).toBe(201);
      expect(respuesta.body.yaPaso).toBe(true);
    });

    it("un usuario que es comprador y organizador a la vez también puede", async () => {
      expect((await guardar(rock.id, tokenAmbos)).status).toBe(201);
    });

    it("403 si el usuario es solo organizador", async () => {
      expect((await guardar(rock.id, tokenOlivia)).status).toBe(403);
    });

    it("404 si el evento no existe", async () => {
      expect((await guardar(ID_INEXISTENTE, tokenCarla)).status).toBe(404);
    });

    it("400 si el id no es UUID", async () => {
      expect((await guardar("abc", tokenCarla)).status).toBe(400);
    });

    it("401 sin token", async () => {
      expect((await request(app).post(`/eventos/${rock.id}/favorito`)).status).toBe(401);
    });
  });

  describe("GET /favoritos", () => {
    it("lista los favoritos con el último guardado primero", async () => {
      const comprador = (await registrar({ email: "orden@example.com", roles: ["COMPRADOR"] })).body.token;
      await guardar(rock.id, comprador);
      await guardar(jazz.id, comprador);
      await guardar(obraPasada.id, comprador);

      const favoritos = await lista(comprador);

      expect(favoritos.map((e) => e.nombre)).toEqual(["Obra ya realizada", "Festival de jazz", "Recital de rock"]);
      expect(favoritos.map((e) => e.yaPaso)).toEqual([true, false, false]);
    });

    it("cada comprador ve solo los suyos", async () => {
      const comprador = (await registrar({ email: "solo@example.com", roles: ["COMPRADOR"] })).body.token;
      await guardar(jazz.id, comprador);

      expect((await lista(comprador)).map((e) => e.id)).toEqual([jazz.id]);
      expect((await lista(tokenCarla)).map((e) => e.id)).not.toContain(obraPasada.id);
    });

    it("un comprador sin favoritos recibe una lista vacía", async () => {
      const nuevo = (await registrar({ email: "vacio@example.com", roles: ["COMPRADOR"] })).body.token;

      const respuesta = await request(app).get("/favoritos").set(bearer(nuevo));

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual([]);
    });

    it("no expone email ni hash de nadie", async () => {
      const respuesta = await request(app).get("/favoritos").set(bearer(tokenCarla));

      expect(JSON.stringify(respuesta.body)).not.toMatch(/@example.com|passwordHash/);
    });

    it("403 si el usuario es solo organizador", async () => {
      expect((await request(app).get("/favoritos").set(bearer(tokenOlivia))).status).toBe(403);
    });

    it("401 sin token", async () => {
      expect((await request(app).get("/favoritos")).status).toBe(401);
    });
  });

  describe("DELETE /eventos/:id/favorito", () => {
    it("quita el evento: 204, y deja de aparecer en la lista (los otros siguen)", async () => {
      const comprador = (await registrar({ email: "quita@example.com", roles: ["COMPRADOR"] })).body.token;
      await guardar(rock.id, comprador);
      await guardar(jazz.id, comprador);

      const respuesta = await quitar(rock.id, comprador);

      expect(respuesta.status).toBe(204);
      expect(respuesta.text).toBe("");
      expect((await lista(comprador)).map((e) => e.id)).toEqual([jazz.id]);
    });

    it("quitar un evento que no era favorito no da error: 204", async () => {
      const respuesta = await quitar(jazz.id, tokenCarla);

      expect(respuesta.status).toBe(204);
    });

    it("quitarlo dos veces seguidas da 204 las dos", async () => {
      const comprador = (await registrar({ email: "dos@example.com", roles: ["COMPRADOR"] })).body.token;
      await guardar(rock.id, comprador);

      expect((await quitar(rock.id, comprador)).status).toBe(204);
      expect((await quitar(rock.id, comprador)).status).toBe(204);
      expect(await lista(comprador)).toEqual([]);
    });

    it("quitar un favorito propio no toca los de otro comprador", async () => {
      await guardar(rock.id, tokenCamilo);
      await quitar(rock.id, tokenCarla);

      expect((await lista(tokenCamilo)).map((e) => e.id)).toContain(rock.id);
    });

    it("se puede volver a guardar después de quitarlo (201)", async () => {
      const comprador = (await registrar({ email: "vuelve@example.com", roles: ["COMPRADOR"] })).body.token;
      await guardar(rock.id, comprador);
      await quitar(rock.id, comprador);

      expect((await guardar(rock.id, comprador)).status).toBe(201);
    });

    it("403 si el usuario es solo organizador", async () => {
      expect((await quitar(rock.id, tokenOlivia)).status).toBe(403);
    });

    it("404 si el evento no existe", async () => {
      expect((await quitar(ID_INEXISTENTE, tokenCarla)).status).toBe(404);
    });

    it("400 si el id no es UUID", async () => {
      expect((await quitar("abc", tokenCarla)).status).toBe(400);
    });

    it("401 sin token", async () => {
      expect((await request(app).delete(`/eventos/${rock.id}/favorito`)).status).toBe(401);
    });
  });
});
