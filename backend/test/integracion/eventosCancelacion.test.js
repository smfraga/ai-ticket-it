import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const enDias = (dias) => new Date(Date.now() + dias * MS_POR_DIA);
const ID_INEXISTENTE = "00000000-0000-4000-8000-000000000000";

const registrar = async (email, roles) => {
  const { body } = await request(app)
    .post("/auth/registro")
    .send({ nombre: "Usuario", apellido: "De Prueba", password: "una-contraseña-larga", email, roles });
  return { token: body.token, id: body.usuario.id };
};

describe("POST /eventos/:id/cancelar (API completa)", () => {
  let rock;
  let olivia;
  let octavio;
  let carla;
  let evento;
  let compra;

  const comoCarla = (metodo, ruta) => request(app)[metodo](ruta).set("Authorization", `Bearer ${carla.token}`);
  const cancelar = (token = olivia.token, id = evento.id) =>
    request(app).post(`/eventos/${id}/cancelar`).set("Authorization", `Bearer ${token}`);

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    rock = await categoriaRepository.save(new Categoria("Rock", "Bandas en vivo"));
    olivia = await registrar("olivia@example.com", ["ORGANIZADOR"]);
    octavio = await registrar("octavio@example.com", ["ORGANIZADOR"]);
    carla = await registrar("carla@example.com", ["COMPRADOR"]);
  });

  // Cada test arranca con un evento nuevo de Olivia y una compra confirmada de Carla (2 × $15.000).
  beforeEach(async () => {
    evento = (
      await request(app)
        .post("/eventos")
        .set("Authorization", `Bearer ${olivia.token}`)
        .send({
          nombre: "Recital para cancelar",
          categoriaId: rock.id,
          fecha: enDias(30).toISOString(),
          tiposEntrada: [{ nombre: "General", precio: 15000, cupo: 100 }],
        })
    ).body;
    compra = (
      await comoCarla("post", `/eventos/${evento.id}/compras`).send({
        tipoEntradaId: evento.tiposEntrada[0].id,
        cantidad: 2,
      })
    ).body;
  });

  it("cancela el evento y la compra confirmada queda reembolsada, con aviso en el chat", async () => {
    const respuesta = await cancelar();

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({ id: evento.id, cancelado: true });

    const detalle = (await comoCarla("get", `/compras/${compra.id}`)).body;
    expect(detalle.estado).toBe("REEMBOLSADA");
    expect(detalle.evento.cancelado).toBe(true);
    expect(detalle.historial.map((c) => c.estado)).toEqual(["PENDIENTE", "CONFIRMADA", "CANCELADA", "REEMBOLSADA"]);
    expect(detalle.historial[3].quien.id).toBe(olivia.id);

    const mensajes = (await comoCarla("get", `/compras/${compra.id}/mensajes`)).body;
    expect(mensajes.map((m) => m.mensaje)).toEqual(["Cancelamos el evento. Te reintegramos $30.000."]);
  });

  it("el evento cancelado sale del catálogo pero sigue en Mis eventos, en su detalle y en las compras del evento", async () => {
    await cancelar();

    const catalogo = (await request(app).get("/eventos?periodo=todos")).body;
    expect(catalogo.map((e) => e.id)).not.toContain(evento.id);

    const misEventos = (await request(app).get(`/eventos?periodo=todos&organizadorId=${olivia.id}`)).body;
    expect(misEventos.find((e) => e.id === evento.id)).toMatchObject({ cancelado: true });
    expect((await request(app).get(`/eventos/${evento.id}`)).body.cancelado).toBe(true);

    const delEvento = (
      await request(app).get(`/eventos/${evento.id}/compras`).set("Authorization", `Bearer ${olivia.token}`)
    ).body;
    expect(delEvento.evento).toMatchObject({ cancelado: true, yaPaso: false });
    expect(delEvento.tiposEntrada[0]).toMatchObject({ cupo: 100, cupoRestante: 100 });
  });

  it("no se pueden comprar entradas de un evento cancelado (409)", async () => {
    await cancelar();

    const respuesta = await comoCarla("post", `/eventos/${evento.id}/compras`).send({
      tipoEntradaId: evento.tiposEntrada[0].id,
      cantidad: 1,
    });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.message).toBe("No se pueden comprar entradas de un evento cancelado");
  });

  it("409 al cancelarlo dos veces o al editarlo después", async () => {
    await cancelar();

    const otraVez = await cancelar();
    const editar = await request(app)
      .patch(`/eventos/${evento.id}`)
      .set("Authorization", `Bearer ${olivia.token}`)
      .send({ nombre: "Otro" });

    expect([otraVez.status, editar.status]).toEqual([409, 409]);
    expect(otraVez.body.message).toBe("El evento ya está cancelado");
  });

  it("401 sin token, 403 para otro organizador o un comprador, 404 si no existe y 400 con un id inválido", async () => {
    const sinToken = await request(app).post(`/eventos/${evento.id}/cancelar`);
    const otro = await cancelar(octavio.token);
    const comprador = await cancelar(carla.token);
    const inexistente = await cancelar(olivia.token, ID_INEXISTENTE);
    const invalido = await cancelar(olivia.token, "no-es-un-uuid");

    expect([sinToken.status, otro.status, comprador.status, inexistente.status, invalido.status]).toEqual([
      401, 403, 403, 404, 400,
    ]);
    expect((await request(app).get(`/eventos/${evento.id}`)).body.cancelado).toBe(false);
  });
});
