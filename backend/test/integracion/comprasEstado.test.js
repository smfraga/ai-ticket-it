import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { Compra } from "../../domain/Compra.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { compraRepository } from "../../repositories/CompraRepository.js";
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

describe("Cancelar y utilizar compras (API completa)", () => {
  let tokenOlivia;
  let tokenOctavio;
  let tokenCarla;
  let tokenCamilo;
  let evento;
  let general;

  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const post = (ruta, token) => request(app).post(ruta).set(bearer(token));
  const cancelar = (id, token) => post(`/compras/${id}/cancelar`, token);
  const utilizar = (id, token) => post(`/compras/${id}/utilizar`, token);
  const pagar = (id, token) => post(`/compras/${id}/pagar`, token);

  // Por la API una compra nace CONFIRMADA (pago simulado); una PENDIENTE se arma con el dominio, como en el seed.
  const comprarSinPagar = async (email = "carla@example.com") => {
    const comprador = await usuarioRepository.findByEmail(email);
    const delRepositorio = await eventoRepository.findById(evento.id);
    return compraRepository.save(new Compra(comprador, delRepositorio, delRepositorio.tiposEntrada[0], 1));
  };

  // Compra confirmada de 1 entrada General.
  const comprar = async (token = tokenCarla) => {
    const respuesta = await post(`/eventos/${evento.id}/compras`, token).send({
      tipoEntradaId: general.id,
      cantidad: 1,
    });
    return respuesta.body;
  };
  const disponibles = async () =>
    (await request(app).get(`/eventos/${evento.id}`)).body.tiposEntrada.find((t) => t.id === general.id).disponibles;

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    const categoria = await categoriaRepository.save(new Categoria("Rock", "Bandas en vivo"));
    tokenOlivia = (await registrar({ email: "olivia@example.com", roles: ["ORGANIZADOR"] })).body.token;
    tokenOctavio = (await registrar({ email: "octavio@example.com", roles: ["ORGANIZADOR"] })).body.token;
    tokenCarla = (await registrar({ email: "carla@example.com", roles: ["COMPRADOR"] })).body.token;
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

  describe("POST /compras/:id/cancelar", () => {
    it("una compra CONFIRMADA queda REEMBOLSADA, con su historial, y el cupo vuelve", async () => {
      const compra = await comprar();
      const antes = await disponibles();

      const respuesta = await cancelar(compra.id, tokenCarla);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toMatchObject({ id: compra.id, estado: "REEMBOLSADA", diasRestantes: null });
      expect(respuesta.body.historial.map((c) => c.estado)).toEqual([
        "PENDIENTE",
        "CONFIRMADA",
        "CANCELADA",
        "REEMBOLSADA",
      ]);
      expect(await disponibles()).toBe(antes + 1);
    });

    it("la compra cancelada se ve en el listado del comprador", async () => {
      const compra = await comprar();
      await cancelar(compra.id, tokenCarla);

      const lista = await request(app).get("/compras").set(bearer(tokenCarla));

      expect(lista.body.find((c) => c.id === compra.id).estado).toBe("REEMBOLSADA");
    });

    it("409 si ya estaba cancelada, y el cupo no se libera dos veces", async () => {
      const compra = await comprar();
      await cancelar(compra.id, tokenCarla);
      const antes = await disponibles();

      const respuesta = await cancelar(compra.id, tokenCarla);

      expect(respuesta.status).toBe(409);
      expect(await disponibles()).toBe(antes);
    });

    it("409 si la compra ya fue utilizada", async () => {
      const compra = await comprar();
      await utilizar(compra.id, tokenOlivia);

      const respuesta = await cancelar(compra.id, tokenCarla);

      expect(respuesta.status).toBe(409);
    });

    it("409 si el evento ya pasó", async () => {
      const compra = await comprar();
      const guardado = await eventoRepository.findById(evento.id);
      const fecha = guardado.fecha;
      guardado.fecha = enDias(-1);

      const respuesta = await cancelar(compra.id, tokenCarla);
      guardado.fecha = fecha;

      expect(respuesta.status).toBe(409);
    });

    it("403 si la cancela otro comprador o el organizador, y la compra queda como estaba", async () => {
      const compra = await comprar();

      expect((await cancelar(compra.id, tokenCamilo)).status).toBe(403);
      expect((await cancelar(compra.id, tokenOlivia)).status).toBe(403);

      const lista = await request(app).get("/compras").set(bearer(tokenCarla));
      expect(lista.body.find((c) => c.id === compra.id).estado).toBe("CONFIRMADA");
    });

    it("404 si la compra no existe", async () => {
      expect((await cancelar(ID_INEXISTENTE, tokenCarla)).status).toBe(404);
    });

    it("400 si el id no es UUID", async () => {
      expect((await cancelar("abc", tokenCarla)).status).toBe(400);
    });

    it("401 sin token", async () => {
      const compra = await comprar();

      expect((await request(app).post(`/compras/${compra.id}/cancelar`)).status).toBe(401);
    });
  });

  describe("POST /compras/:id/utilizar", () => {
    it("el organizador pasa una compra CONFIRMADA a UTILIZADA y el cupo sigue ocupado", async () => {
      const compra = await comprar();
      const antes = await disponibles();

      const respuesta = await utilizar(compra.id, tokenOlivia);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toMatchObject({ id: compra.id, estado: "UTILIZADA", diasRestantes: null });
      expect(respuesta.body.historial.at(-1)).toMatchObject({
        estado: "UTILIZADA",
        quien: { nombre: "Usuario" },
      });
      expect(await disponibles()).toBe(antes);
    });

    it("el organizador la ve UTILIZADA en las compras de su evento", async () => {
      const compra = await comprar();
      await utilizar(compra.id, tokenOlivia);

      const lista = await request(app).get(`/eventos/${evento.id}/compras`).set(bearer(tokenOlivia));

      expect(lista.body.compras.find((c) => c.id === compra.id).estado).toBe("UTILIZADA");
    });

    it("409 si ya estaba utilizada", async () => {
      const compra = await comprar();
      await utilizar(compra.id, tokenOlivia);

      expect((await utilizar(compra.id, tokenOlivia)).status).toBe(409);
    });

    it("409 si la compra estaba cancelada", async () => {
      const compra = await comprar();
      await cancelar(compra.id, tokenCarla);

      expect((await utilizar(compra.id, tokenOlivia)).status).toBe(409);
    });

    it("403 si la marca el comprador o el organizador de otro evento, y sigue CONFIRMADA", async () => {
      const compra = await comprar();

      expect((await utilizar(compra.id, tokenCarla)).status).toBe(403);
      expect((await utilizar(compra.id, tokenOctavio)).status).toBe(403);

      const lista = await request(app).get("/compras").set(bearer(tokenCarla));
      expect(lista.body.find((c) => c.id === compra.id).estado).toBe("CONFIRMADA");
    });

    it("404 si la compra no existe", async () => {
      expect((await utilizar(ID_INEXISTENTE, tokenOlivia)).status).toBe(404);
    });

    it("400 si el id no es UUID", async () => {
      expect((await utilizar("abc", tokenOlivia)).status).toBe(400);
    });

    it("401 sin token", async () => {
      const compra = await comprar();

      expect((await request(app).post(`/compras/${compra.id}/utilizar`)).status).toBe(401);
    });
  });

  describe("POST /compras/:id/pagar", () => {
    it("el comprador paga una PENDIENTE: queda CONFIRMADA, con días restantes, y el cupo sigue ocupado", async () => {
      const compra = await comprarSinPagar();
      const antes = await disponibles();

      const respuesta = await pagar(compra.id, tokenCarla);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toMatchObject({ id: compra.id, estado: "CONFIRMADA", diasRestantes: expect.any(Number) });
      expect(respuesta.body.historial.map((c) => c.estado)).toEqual(["PENDIENTE", "CONFIRMADA"]);
      expect(await disponibles()).toBe(antes);
    });

    it("409 si la compra ya estaba confirmada", async () => {
      const compra = await comprar();

      const respuesta = await pagar(compra.id, tokenCarla);

      expect(respuesta.status).toBe(409);
    });

    it("403 si paga otro comprador o el organizador, y sigue PENDIENTE", async () => {
      const compra = await comprarSinPagar();

      expect((await pagar(compra.id, tokenCamilo)).status).toBe(403);
      expect((await pagar(compra.id, tokenOlivia)).status).toBe(403);
      expect((await request(app).get(`/compras/${compra.id}`).set(bearer(tokenCarla))).body.estado).toBe("PENDIENTE");
    });

    it("404 si la compra no existe, 400 si el id no es UUID y 401 sin token", async () => {
      expect((await pagar(ID_INEXISTENTE, tokenCarla)).status).toBe(404);
      expect((await pagar("abc", tokenCarla)).status).toBe(400);
      expect((await request(app).post(`/compras/${ID_INEXISTENTE}/pagar`)).status).toBe(401);
    });
  });
});
