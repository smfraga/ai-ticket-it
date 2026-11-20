import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const enDias = (dias) => new Date(Date.now() + dias * MS_POR_DIA);
const URL_EXTERNA = "https://example.com/foto.jpg";

// Bytes con la firma de cada formato (el contenido no importa para el backend).
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const comoDataUrl = (bytes, tipo = "image/jpeg") => `data:${tipo};base64,${bytes.toString("base64")}`;
const RUTA_DE_IMAGEN = /^\/eventos\/[0-9a-f-]{36}\/imagenes\/[0-9a-f-]{36}$/;

const registrar = async (email, roles) =>
  (
    await request(app)
      .post("/auth/registro")
      .send({ nombre: "Usuario", apellido: "De Prueba", password: "una-contraseña-larga", email, roles })
  ).body.token;

describe("Imágenes de un evento (API completa)", () => {
  let tokenOlivia;
  let tokenOctavio;
  let categoriaId;

  const conToken = (pedido, token = tokenOlivia) => pedido.set("Authorization", `Bearer ${token}`);
  const subir = (eventoId, cuerpo, token) =>
    conToken(request(app).post(`/eventos/${eventoId}/imagenes`), token).send(cuerpo);
  const crearEvento = async (multimedia = []) =>
    (
      await conToken(request(app).post("/eventos")).send({
        nombre: "Recital con fotos",
        categoriaId,
        fecha: enDias(20).toISOString(),
        tiposEntrada: [{ nombre: "General", precio: 1000, cupo: 10 }],
        multimedia,
      })
    ).body;

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    categoriaId = (await categoriaRepository.save(new Categoria("Recitales con imágenes", "Bandas"))).id;
    tokenOlivia = await registrar("olivia.imagenes@example.com", ["ORGANIZADOR"]);
    tokenOctavio = await registrar("octavio.imagenes@example.com", ["ORGANIZADOR"]);
  });

  it("el organizador sube una imagen: 201 con su ruta al final de multimedia, y esa ruta sirve la imagen (pública)", async () => {
    const evento = await crearEvento([URL_EXTERNA]);

    const respuesta = await subir(evento.id, { imagen: comoDataUrl(JPEG) });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.multimedia).toHaveLength(2);
    expect(respuesta.body.multimedia[0]).toBe(URL_EXTERNA);
    const ruta = respuesta.body.multimedia[1];
    expect(ruta).toMatch(RUTA_DE_IMAGEN);
    expect(ruta.startsWith(`/eventos/${evento.id}/imagenes/`)).toBe(true);

    const imagen = await request(app).get(ruta);
    expect(imagen.status).toBe(200);
    expect(imagen.headers["content-type"]).toBe("image/jpeg");
    expect(imagen.headers["cache-control"]).toContain("immutable");
    expect(Buffer.compare(imagen.body, JPEG)).toBe(0);

    // El detalle y el catálogo traen la misma lista.
    expect((await request(app).get(`/eventos/${evento.id}`)).body.multimedia).toEqual([URL_EXTERNA, ruta]);
  });

  it("acepta PNG y cada imagen tiene su propio id", async () => {
    const evento = await crearEvento();
    await subir(evento.id, { imagen: comoDataUrl(JPEG) });

    const respuesta = await subir(evento.id, { imagen: comoDataUrl(PNG, "image/png") });

    const [primera, segunda] = respuesta.body.multimedia;
    expect(primera).not.toBe(segunda);
    expect((await request(app).get(segunda)).headers["content-type"]).toBe("image/png");
  });

  it("una imagen de unos 300 KB (más que los 100 KB del resto de la API) entra", async () => {
    const evento = await crearEvento();
    const grande = Buffer.concat([JPEG, Buffer.alloc(300 * 1024)]);

    const respuesta = await subir(evento.id, { imagen: comoDataUrl(grande) });

    expect(respuesta.status).toBe(201);
    expect((await request(app).get(respuesta.body.multimedia[0])).body.length).toBe(grande.length);
  });

  it("una imagen de más de 400 KB (con el cuerpo bajo 600 KB) la rechaza el dominio con 400", async () => {
    const evento = await crearEvento();

    const respuesta = await subir(evento.id, { imagen: comoDataUrl(Buffer.concat([JPEG, Buffer.alloc(401 * 1024)])) });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.message).toBe("La imagen no puede superar los 400 KB");
  });

  it("un cuerpo de más de 600 KB lo corta express.json con 413", async () => {
    const evento = await crearEvento();

    const respuesta = await subir(evento.id, { imagen: comoDataUrl(Buffer.concat([JPEG, Buffer.alloc(460 * 1024)])) });

    expect(respuesta.status).toBe(413);
    expect(respuesta.body.message).toBe("El cuerpo de la request supera el tamaño máximo permitido");
  });

  it("el resto de la API sigue con el tope de 100 KB", async () => {
    const respuesta = await conToken(request(app).post("/eventos")).send({ nombre: "x".repeat(110 * 1024) });

    expect(respuesta.status).toBe(413);
  });

  it.each([
    ["una imagen que no es JPEG ni PNG", { imagen: comoDataUrl(Buffer.from("GIF89a....")) }],
    ["un data URL de otro tipo", { imagen: `data:image/gif;base64,${Buffer.from("GIF89a").toString("base64")}` }],
    ["un texto que no es data URL", { imagen: URL_EXTERNA }],
    ["un cuerpo sin imagen", {}],
  ])("rechaza %s con 400 y no agrega nada", async (_, cuerpo) => {
    const evento = await crearEvento();

    expect((await subir(evento.id, cuerpo)).status).toBe(400);
    expect((await request(app).get(`/eventos/${evento.id}`)).body.multimedia).toEqual([]);
  });

  it("409 al pasar las 6 imágenes, contando las URLs", async () => {
    const evento = await crearEvento([URL_EXTERNA, URL_EXTERNA, URL_EXTERNA, URL_EXTERNA, URL_EXTERNA]);
    expect((await subir(evento.id, { imagen: comoDataUrl(JPEG) })).status).toBe(201);

    const respuesta = await subir(evento.id, { imagen: comoDataUrl(JPEG) });

    expect(respuesta.status).toBe(409);
    expect((await request(app).get(`/eventos/${evento.id}`)).body.multimedia).toHaveLength(6);
  });

  it("403 si lo intenta otro organizador, 401 sin token y 404 si el evento no existe", async () => {
    const evento = await crearEvento();

    expect((await subir(evento.id, { imagen: comoDataUrl(JPEG) }, tokenOctavio)).status).toBe(403);
    expect(
      (
        await request(app)
          .post(`/eventos/${evento.id}/imagenes`)
          .send({ imagen: comoDataUrl(JPEG) })
      ).status,
    ).toBe(401);
    expect((await subir(randomUUID(), { imagen: comoDataUrl(JPEG) })).status).toBe(404);
  });

  it("409 en un evento cancelado", async () => {
    const evento = await crearEvento();
    await conToken(request(app).post(`/eventos/${evento.id}/cancelar`));

    expect((await subir(evento.id, { imagen: comoDataUrl(JPEG) })).status).toBe(409);
  });

  it("al editar se conservan las que siguen en multimedia y las que salieron dejan de servirse (404)", async () => {
    const evento = await crearEvento([URL_EXTERNA]);
    await subir(evento.id, { imagen: comoDataUrl(JPEG) });
    const [, primera, segunda] = (await subir(evento.id, { imagen: comoDataUrl(PNG, "image/png") })).body.multimedia;

    const respuesta = await conToken(request(app).patch(`/eventos/${evento.id}`)).send({ multimedia: [segunda] });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.multimedia).toEqual([segunda]);
    expect((await request(app).get(primera)).status).toBe(404);
    expect((await request(app).get(segunda)).status).toBe(200);
  });

  it("al editar no se puede conservar una imagen de otro evento (400) y el evento queda como estaba", async () => {
    const otro = await crearEvento();
    const ajena = (await subir(otro.id, { imagen: comoDataUrl(JPEG) })).body.multimedia[0];
    const evento = await crearEvento([URL_EXTERNA]);

    const respuesta = await conToken(request(app).patch(`/eventos/${evento.id}`)).send({ multimedia: [ajena] });

    expect(respuesta.status).toBe(400);
    expect((await request(app).get(`/eventos/${evento.id}`)).body.multimedia).toEqual([URL_EXTERNA]);
  });

  it("pedir una imagen con ids que no son UUID da 400, y una que no existe, 404", async () => {
    const evento = await crearEvento();

    expect((await request(app).get(`/eventos/${evento.id}/imagenes/no-es-un-id`)).status).toBe(400);
    expect((await request(app).get(`/eventos/no-es-un-id/imagenes/${randomUUID()}`)).status).toBe(400);
    expect((await request(app).get(`/eventos/${evento.id}/imagenes/${randomUUID()}`)).status).toBe(404);
    expect((await request(app).get(`/eventos/${randomUUID()}/imagenes/${randomUUID()}`)).status).toBe(404);
  });
});
