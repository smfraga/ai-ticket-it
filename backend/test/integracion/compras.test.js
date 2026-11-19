import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { Evento } from "../../domain/Evento.js";
import { TipoEntrada } from "../../domain/TipoEntrada.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { eventoRepository } from "../../repositories/EventoRepository.js";
import { usuarioRepository } from "../../repositories/UsuarioRepository.js";
import { SECRETO_DE_PRUEBA, comoComprador } from "../helpers/sesion.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const enDias = (dias) => new Date(Date.now() + dias * MS_POR_DIA);
const ID_INEXISTENTE = "00000000-0000-4000-8000-000000000000";

const registrar = (cambios) =>
  request(app)
    .post("/auth/registro")
    .send({ nombre: "Usuario", apellido: "De Prueba", password: "una-contraseña-larga", ...cambios });

describe("Compras (API completa)", () => {
  let tokenOlivia;
  let tokenOctavio;
  let tokenCarla;
  let tokenCamilo;
  let evento;
  let general;
  let vip;

  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const comprar = (token, eventoId, body) =>
    request(app).post(`/eventos/${eventoId}/compras`).set(bearer(token)).send(body);

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    const categoria = await categoriaRepository.save(new Categoria("Rock", "Bandas en vivo"));
    tokenOlivia = (await registrar({ email: "olivia@example.com", roles: ["ORGANIZADOR"] })).body.token;
    tokenOctavio = (await registrar({ email: "octavio@example.com", roles: ["ORGANIZADOR"] })).body.token;
    tokenCarla = (
      await registrar({ email: "carla@example.com", nombre: "Carla", apellido: "Gómez", roles: ["COMPRADOR"] })
    ).body.token;
    tokenCamilo = (await registrar({ email: "camilo@example.com", roles: ["COMPRADOR"] })).body.token;

    const creado = await request(app)
      .post("/eventos")
      .set(bearer(tokenOlivia))
      .send({
        nombre: "Recital de rock",
        categoriaId: categoria.id,
        fecha: enDias(10).toISOString(),
        tiposEntrada: [
          { nombre: "General", precio: 10000, cupo: 5 },
          { nombre: "VIP", precio: 25000, cupo: 2 },
        ],
      });
    evento = creado.body;
    general = evento.tiposEntrada.find((t) => t.nombre === "General");
    vip = evento.tiposEntrada.find((t) => t.nombre === "VIP");
  });

  describe("POST /eventos/:id/compras", () => {
    it("un comprador compra: 201, queda CONFIRMADA con dos cambios de estado y el cupo baja", async () => {
      const respuesta = await comprar(tokenCarla, evento.id, { tipoEntradaId: general.id, cantidad: 2 });

      expect(respuesta.status).toBe(201);
      expect(respuesta.body).toMatchObject({
        estado: "CONFIRMADA",
        cantidad: 2,
        total: 20000,
        diasRestantes: 10,
        tipoEntrada: { id: general.id, cupoRestante: 3 },
      });
      expect(respuesta.body.historial.map((c) => c.estado)).toEqual(["PENDIENTE", "CONFIRMADA"]);

      const detalle = await request(app).get(`/eventos/${evento.id}`);
      expect(detalle.body.tiposEntrada.find((t) => t.id === general.id).disponibles).toBe(3);
    });

    it("no expone el email ni el hash del comprador", async () => {
      const respuesta = await comprar(tokenCarla, evento.id, { tipoEntradaId: general.id, cantidad: 1 });

      expect(JSON.stringify(respuesta.body)).not.toMatch(/carla@example.com|passwordHash/);
    });

    it("401 sin token", async () => {
      const respuesta = await request(app)
        .post(`/eventos/${evento.id}/compras`)
        .send({ tipoEntradaId: general.id, cantidad: 1 });

      expect(respuesta.status).toBe(401);
    });

    it("403 si el usuario es solo organizador", async () => {
      const respuesta = await comprar(tokenOctavio, evento.id, { tipoEntradaId: general.id, cantidad: 1 });

      expect(respuesta.status).toBe(403);
    });

    it("403 si un usuario con los dos roles compra en su propio evento (y el cupo no cambia)", async () => {
      const tokenAmbos = (await registrar({ email: "ambos@example.com", roles: ["COMPRADOR", "ORGANIZADOR"] })).body
        .token;
      const propio = (
        await request(app)
          .post("/eventos")
          .set(bearer(tokenAmbos))
          .send({
            nombre: "Evento propio",
            categoriaId: evento.categoria.id,
            fecha: enDias(15).toISOString(),
            tiposEntrada: [{ nombre: "General", precio: 1000, cupo: 10 }],
          })
      ).body;

      const respuesta = await comprar(tokenAmbos, propio.id, { tipoEntradaId: propio.tiposEntrada[0].id, cantidad: 1 });

      expect(respuesta.status).toBe(403);
      expect(respuesta.body.message).toBe("No podés comprar entradas de tu propio evento");
      expect((await request(app).get(`/eventos/${propio.id}`)).body.tiposEntrada[0].disponibles).toBe(10);
    });

    it.each([
      ["cantidad 0", { cantidad: 0 }],
      ["cantidad decimal", { cantidad: 1.5 }],
      ["cantidad en texto", { cantidad: "2" }],
      ["tipoEntradaId que no es UUID", { tipoEntradaId: "abc" }],
      ["campos de más", { total: 1 }],
    ])("400 con %s", async (_caso, cambios) => {
      const respuesta = await comprar(tokenCarla, evento.id, {
        tipoEntradaId: general.id,
        cantidad: 1,
        ...cambios,
      });

      expect(respuesta.status).toBe(400);
    });

    it("400 si el id del evento no es UUID", async () => {
      const respuesta = await comprar(tokenCarla, "abc", { tipoEntradaId: general.id, cantidad: 1 });

      expect(respuesta.status).toBe(400);
    });

    it("404 si el evento no existe", async () => {
      const respuesta = await comprar(tokenCarla, ID_INEXISTENTE, { tipoEntradaId: general.id, cantidad: 1 });

      expect(respuesta.status).toBe(404);
    });

    it("404 si el tipo de entrada no existe en ese evento", async () => {
      const respuesta = await comprar(tokenCarla, evento.id, { tipoEntradaId: ID_INEXISTENTE, cantidad: 1 });

      expect(respuesta.status).toBe(404);
    });

    it("409 si supera el cupo y deja el cupo intacto; después agota el cupo justo", async () => {
      const excedida = await comprar(tokenCamilo, evento.id, { tipoEntradaId: vip.id, cantidad: 3 });
      expect(excedida.status).toBe(409);

      const justo = await comprar(tokenCamilo, evento.id, { tipoEntradaId: vip.id, cantidad: 2 });
      expect(justo.status).toBe(201);

      const agotada = await comprar(tokenCarla, evento.id, { tipoEntradaId: vip.id, cantidad: 1 });
      expect(agotada.status).toBe(409);
    });

    it("409 si el evento ya pasó", async () => {
      const olivia = await usuarioRepository.findByEmail("olivia@example.com");
      const categoria = (await categoriaRepository.findAll())[0];
      const pasado = await eventoRepository.save(
        new Evento("Evento viejo", "", categoria, enDias(-5), olivia, [new TipoEntrada("General", "", 1000, 10)]),
      );

      const respuesta = await comprar(tokenCarla, pasado.id, {
        tipoEntradaId: pasado.tiposEntrada[0].id,
        cantidad: 1,
      });

      expect(respuesta.status).toBe(409);
    });

    it("401 si el token es de un usuario que ya no existe", async () => {
      const respuesta = await comprar(comoComprador(ID_INEXISTENTE).replace("Bearer ", ""), evento.id, {
        tipoEntradaId: general.id,
        cantidad: 1,
      });

      expect(respuesta.status).toBe(401);
    });
  });

  describe("GET /compras", () => {
    it("lista solo las compras del comprador, con estado y días restantes", async () => {
      const respuesta = await request(app).get("/compras").set(bearer(tokenCarla));

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.length).toBeGreaterThanOrEqual(2);
      for (const compra of respuesta.body) {
        expect(compra.estado).toBe("CONFIRMADA");
        expect(compra.diasRestantes).toBe(10);
        expect(compra.evento.id).toBeDefined();
      }
      expect(JSON.stringify(respuesta.body)).not.toContain("camilo@example.com");
    });

    it("un comprador sin compras recibe una lista vacía", async () => {
      const nuevo = (await registrar({ email: "nuevo@example.com", roles: ["COMPRADOR"] })).body.token;

      const respuesta = await request(app).get("/compras").set(bearer(nuevo));

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual([]);
    });

    it("401 sin token", async () => {
      expect((await request(app).get("/compras")).status).toBe(401);
    });
  });

  describe("GET /eventos/:id/compras", () => {
    it("el organizador ve las compras con estado, comprador y cupo restante por tipo", async () => {
      const respuesta = await request(app).get(`/eventos/${evento.id}/compras`).set(bearer(tokenOlivia));

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.tiposEntrada).toEqual([
        { id: general.id, nombre: "General", cupo: 5, cupoRestante: 2 },
        { id: vip.id, nombre: "VIP", cupo: 2, cupoRestante: 0 },
      ]);
      const compradores = respuesta.body.compras.map((c) => c.comprador.nombre);
      expect(compradores).toContain("Carla");
      expect(respuesta.body.compras.every((c) => c.estado === "CONFIRMADA")).toBe(true);
      expect(JSON.stringify(respuesta.body)).not.toMatch(/@example.com|passwordHash/);
    });

    it("403 si es otro organizador", async () => {
      const respuesta = await request(app).get(`/eventos/${evento.id}/compras`).set(bearer(tokenOctavio));

      expect(respuesta.status).toBe(403);
    });

    it("403 si es un comprador", async () => {
      const respuesta = await request(app).get(`/eventos/${evento.id}/compras`).set(bearer(tokenCarla));

      expect(respuesta.status).toBe(403);
    });

    it("404 si el evento no existe", async () => {
      const respuesta = await request(app).get(`/eventos/${ID_INEXISTENTE}/compras`).set(bearer(tokenOlivia));

      expect(respuesta.status).toBe(404);
    });

    it("400 si el id no es UUID", async () => {
      const respuesta = await request(app).get("/eventos/abc/compras").set(bearer(tokenOlivia));

      expect(respuesta.status).toBe(400);
    });

    it("401 sin token", async () => {
      expect((await request(app).get(`/eventos/${evento.id}/compras`)).status).toBe(401);
    });
  });
});
