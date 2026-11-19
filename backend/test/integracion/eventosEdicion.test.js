import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const enDias = (dias) => new Date(Date.now() + dias * MS_POR_DIA);
const ID_INEXISTENTE = "00000000-0000-4000-8000-000000000000";

const registrar = async (email, roles) =>
  (
    await request(app)
      .post("/auth/registro")
      .send({ nombre: "Usuario", apellido: "De Prueba", password: "una-contraseña-larga", email, roles })
  ).body.token;

describe("PATCH /eventos/:id (API completa)", () => {
  let rock;
  let teatro;
  let olivia;
  let octavio;
  let carla;
  let evento;

  const editar = (cambios, token = olivia, id = evento.id) =>
    request(app).patch(`/eventos/${id}`).set("Authorization", `Bearer ${token}`).send(cambios);

  const tiposActuales = () => evento.tiposEntrada.map(({ id, nombre, precio, cupo }) => ({ id, nombre, precio, cupo }));

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    rock = await categoriaRepository.save(new Categoria("Rock", "Bandas en vivo"));
    teatro = await categoriaRepository.save(new Categoria("Teatro", "Obras"));
    olivia = await registrar("olivia@example.com", ["ORGANIZADOR"]);
    octavio = await registrar("octavio@example.com", ["ORGANIZADOR"]);
    carla = await registrar("carla@example.com", ["COMPRADOR"]);
  });

  // Cada test arranca con un evento nuevo de Olivia en 30 días y 2 entradas VIP compradas por Carla.
  beforeEach(async () => {
    evento = (
      await request(app)
        .post("/eventos")
        .set("Authorization", `Bearer ${olivia}`)
        .send({
          nombre: "Recital de rock",
          categoriaId: rock.id,
          fecha: enDias(30).toISOString(),
          tiposEntrada: [
            { nombre: "General", precio: 15000, cupo: 100 },
            { nombre: "VIP", precio: 40000, cupo: 20 },
          ],
        })
    ).body;
    await request(app)
      .post(`/eventos/${evento.id}/compras`)
      .set("Authorization", `Bearer ${carla}`)
      .send({ tipoEntradaId: evento.tiposEntrada[1].id, cantidad: 2 });
  });

  it("el organizador cambia datos, sube el cupo de un tipo con ventas, quita uno sin ventas y agrega otro", async () => {
    const [, vip] = tiposActuales();
    const respuesta = await editar({
      nombre: "Rock acústico",
      categoriaId: teatro.id,
      tiposEntrada: [{ ...vip, cupo: 30 }, { nombre: "Platea", precio: 25000, cupo: 50 }],
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      nombre: "Rock acústico",
      categoria: { id: teatro.id },
      tiposEntrada: [
        { id: vip.id, nombre: "VIP", cupo: 30, disponibles: 28 },
        { nombre: "Platea", cupo: 50, disponibles: 50 },
      ],
    });
    expect(respuesta.body.tiposEntrada[1].id).toEqual(expect.any(String));

    const detalle = await request(app).get(`/eventos/${evento.id}`);
    expect(detalle.body.nombre).toBe("Rock acústico");
  });

  it("al cambiar la fecha, la compradora recibe un aviso en el chat de su compra", async () => {
    const nuevaFecha = enDias(45);
    expect((await editar({ fecha: nuevaFecha.toISOString() })).status).toBe(200);

    const [compra] = (await request(app).get("/compras").set("Authorization", `Bearer ${carla}`)).body.filter(
      (c) => c.evento.id === evento.id,
    );
    expect(compra.evento.fecha).toBe(nuevaFecha.toISOString());
    const mensajes = (
      await request(app).get(`/compras/${compra.id}/mensajes`).set("Authorization", `Bearer ${carla}`)
    ).body;
    expect(mensajes).toHaveLength(1);
    expect(mensajes[0]).toMatchObject({ autor: { rol: "ORGANIZADOR" } });
    expect(mensajes[0].mensaje).toMatch(/^Cambiamos la fecha del evento: era el .+ y ahora es el .+\.$/);
  });

  it("409 al bajar el cupo de VIP por debajo de lo vendido, al cambiarle el precio o al quitarlo", async () => {
    const [general, vip] = tiposActuales();

    const cupo = await editar({ tiposEntrada: [general, { ...vip, cupo: 1 }] });
    const precio = await editar({ tiposEntrada: [general, { ...vip, precio: 1 }] });
    const quitar = await editar({ tiposEntrada: [general] });

    expect([cupo.status, precio.status, quitar.status]).toEqual([409, 409, 409]);
    expect(cupo.body.message).toBe("El cupo de VIP no puede ser menor a las 2 entradas vendidas");
    expect(quitar.body.message).toBe("No se puede quitar VIP: ya tiene entradas vendidas");
  });

  it("400 con una fecha pasada, un body vacío o un id inválido", async () => {
    const pasada = await editar({ fecha: enDias(-1).toISOString() });
    const vacio = await editar({});
    const idInvalido = await editar({ nombre: "x" }, olivia, "no-es-un-uuid");

    expect([pasada.status, vacio.status, idInvalido.status]).toEqual([400, 400, 400]);
    expect(pasada.body.message).toBe("La fecha del evento debe ser futura");
  });

  it("401 sin token, 403 para otro organizador o un comprador y 404 si el evento no existe", async () => {
    const sinToken = await request(app).patch(`/eventos/${evento.id}`).send({ nombre: "x" });
    const otro = await editar({ nombre: "x" }, octavio);
    const comprador = await editar({ nombre: "x" }, carla);
    const inexistente = await editar({ nombre: "x" }, olivia, ID_INEXISTENTE);

    expect([sinToken.status, otro.status, comprador.status, inexistente.status]).toEqual([401, 403, 403, 404]);
    expect(otro.body.message).toBe("Solo el organizador del evento puede editarlo");
  });
});
