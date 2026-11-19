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

describe("Detalle de la compra (API completa)", () => {
  let tokenOlivia;
  let tokenOctavio;
  let tokenCarla;
  let tokenCamilo;
  let evento;
  let general;

  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const post = (ruta, token) => request(app).post(ruta).set(bearer(token));
  const detalle = (id, token) => {
    const pedido = request(app).get(`/compras/${id}`);
    return token ? pedido.set(bearer(token)) : pedido;
  };
  const comprar = async () =>
    (await post(`/eventos/${evento.id}/compras`, tokenCarla).send({ tipoEntradaId: general.id, cantidad: 2 })).body;

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
      await post("/eventos", tokenOlivia).send({
        nombre: "Recital de rock",
        categoriaId: categoria.id,
        fecha: enDias(10).toISOString(),
        tiposEntrada: [{ nombre: "General", precio: 10000, cupo: 50 }],
      })
    ).body;
    general = evento.tiposEntrada[0];
  });

  describe("GET /compras/:id", () => {
    it("el comprador ve su compra con historial, organizador y sin reseña", async () => {
      const compra = await comprar();

      const respuesta = await detalle(compra.id, tokenCarla);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toMatchObject({
        id: compra.id,
        estado: "CONFIRMADA",
        cantidad: 2,
        total: 20000,
        diasRestantes: 10,
        comprador: { nombre: "Carla", apellido: "Gómez" },
        evento: { id: evento.id, yaPaso: false, organizador: { nombre: "Olivia", apellido: "Rossi" } },
        tipoEntrada: { nombre: "General" },
        resenia: null,
      });
      expect(respuesta.body.historial.map((c) => c.estado)).toEqual(["PENDIENTE", "CONFIRMADA"]);
    });

    it("el organizador del evento también la ve", async () => {
      const compra = await comprar();

      const respuesta = await detalle(compra.id, tokenOlivia);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.id).toBe(compra.id);
    });

    it("refleja los cambios de estado", async () => {
      const compra = await comprar();
      await post(`/compras/${compra.id}/cancelar`, tokenCarla);

      const respuesta = await detalle(compra.id, tokenCarla);

      expect(respuesta.body).toMatchObject({ estado: "REEMBOLSADA", diasRestantes: null });
      expect(respuesta.body.historial.at(-1).estado).toBe("REEMBOLSADA");
    });

    it("una vez reseñada, trae la reseña", async () => {
      const compra = await comprar();
      await post(`/compras/${compra.id}/utilizar`, tokenOlivia);
      await post(`/compras/${compra.id}/resenia`, tokenCarla).send({ puntuacion: 5, detalle: "Excelente show" });

      const respuesta = await detalle(compra.id, tokenCarla);

      expect(respuesta.body.estado).toBe("UTILIZADA");
      expect(respuesta.body.resenia).toMatchObject({ puntuacion: 5, detalle: "Excelente show" });
    });

    it("no expone el email ni el hash de nadie", async () => {
      const compra = await comprar();

      const texto = JSON.stringify((await detalle(compra.id, tokenOlivia)).body);

      expect(texto).not.toContain("example.com");
      expect(texto).not.toContain("passwordHash");
    });

    it("403 si la ve otro comprador o el organizador de otro evento", async () => {
      const compra = await comprar();

      expect((await detalle(compra.id, tokenCamilo)).status).toBe(403);
      expect((await detalle(compra.id, tokenOctavio)).status).toBe(403);
    });

    it("404 si la compra no existe", async () => {
      expect((await detalle(ID_INEXISTENTE, tokenCarla)).status).toBe(404);
    });

    it("400 si el id no es un UUID", async () => {
      expect((await detalle("abc", tokenCarla)).status).toBe(400);
    });

    it("401 sin token", async () => {
      const compra = await comprar();

      expect((await detalle(compra.id)).status).toBe(401);
    });

    it("GET /compras sigue devolviendo la lista", async () => {
      const respuesta = await request(app).get("/compras").set(bearer(tokenCarla));

      expect(respuesta.status).toBe(200);
      expect(Array.isArray(respuesta.body)).toBe(true);
    });
  });
});
