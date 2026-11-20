import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

// Bytes con la firma de un JPEG (el contenido no importa para el backend).
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const comoDataUrl = (bytes, tipo = "image/jpeg") => `data:${tipo};base64,${bytes.toString("base64")}`;

const registrar = async (email, nombre, roles) =>
  (
    await request(app)
      .post("/auth/registro")
      .send({ nombre, apellido: "De Prueba", password: "una-contraseña-larga", email, roles })
  ).body;

describe("Foto de perfil (API completa)", () => {
  let carla;
  let olivia;

  const subir = (cuerpo, token = carla.token) =>
    request(app).put("/perfil/foto").set("Authorization", `Bearer ${token}`).send(cuerpo);

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    carla = await registrar("carla.foto@example.com", "Carla", ["COMPRADOR"]);
    olivia = await registrar("olivia.foto@example.com", "Olivia", ["ORGANIZADOR"]);
  });

  it("sin token no se puede subir ni quitar (401)", async () => {
    expect(
      (
        await request(app)
          .put("/perfil/foto")
          .send({ imagen: comoDataUrl(JPEG) })
      ).status,
    ).toBe(401);
    expect((await request(app).delete("/perfil/foto")).status).toBe(401);
  });

  it("sin foto, el usuario trae foto null y pedirla da 404", async () => {
    expect(carla.usuario.foto).toBeNull();
    expect((await request(app).get(`/usuarios/${carla.usuario.id}/foto`)).status).toBe(404);
  });

  it("subir una foto devuelve la ruta con su versión, y esa ruta sirve la imagen (pública)", async () => {
    const respuesta = await subir({ imagen: comoDataUrl(JPEG) });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.foto).toBe(`/usuarios/${carla.usuario.id}/foto?v=1`);

    const imagen = await request(app).get(respuesta.body.foto);
    expect(imagen.status).toBe(200);
    expect(imagen.headers["content-type"]).toBe("image/jpeg");
    expect(imagen.headers["cache-control"]).toContain("max-age=86400");
    expect(Buffer.compare(imagen.body, JPEG)).toBe(0);
  });

  it("otra foto cambia la versión de la ruta", async () => {
    expect((await subir({ imagen: comoDataUrl(JPEG) })).body.foto).toBe(`/usuarios/${carla.usuario.id}/foto?v=2`);
  });

  it("la otra parte del chat ve la foto en la lista de mensajes y en cada mensaje", async () => {
    const categoria = await categoriaRepository.save(new Categoria("Recitales de la foto", "Bandas"));
    const evento = (
      await request(app)
        .post("/eventos")
        .set("Authorization", `Bearer ${olivia.token}`)
        .send({
          nombre: "Recital con fotos",
          categoriaId: categoria.id,
          fecha: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          tiposEntrada: [{ nombre: "General", precio: 1000, cupo: 10 }],
        })
    ).body;
    const compra = (
      await request(app)
        .post(`/eventos/${evento.id}/compras`)
        .set("Authorization", `Bearer ${carla.token}`)
        .send({ tipoEntradaId: evento.tiposEntrada[0].id, cantidad: 1 })
    ).body;
    await request(app)
      .post(`/compras/${compra.id}/mensajes`)
      .set("Authorization", `Bearer ${carla.token}`)
      .send({ mensaje: "Hola" });

    const conversaciones = await request(app).get("/conversaciones").set("Authorization", `Bearer ${olivia.token}`);
    const mensajes = await request(app)
      .get(`/compras/${compra.id}/mensajes`)
      .set("Authorization", `Bearer ${olivia.token}`);

    const rutaDeCarla = `/usuarios/${carla.usuario.id}/foto?v=2`;
    expect(conversaciones.body.conversaciones[0].contraparte.foto).toBe(rutaDeCarla);
    expect(mensajes.body[0].autor.foto).toBe(rutaDeCarla);
  });

  it.each([
    ["una imagen que no es JPEG ni PNG", { imagen: comoDataUrl(Buffer.from("GIF89a....")) }],
    ["un texto que no es un data URL", { imagen: "esto no es una imagen" }],
    ["un data URL de otro tipo", { imagen: `data:image/gif;base64,${Buffer.from("GIF89a").toString("base64")}` }],
    ["un body sin la imagen", {}],
  ])("rechaza %s con 400 y la foto anterior sigue", async (_, cuerpo) => {
    expect((await subir(cuerpo)).status).toBe(400);
    expect((await request(app).get(`/usuarios/${carla.usuario.id}/foto`)).status).toBe(200);
  });

  it("un cuerpo de más de 100 KB lo corta express.json con 413 y un mensaje claro", async () => {
    const respuesta = await subir({ imagen: comoDataUrl(Buffer.concat([JPEG, Buffer.alloc(100 * 1024)])) });

    expect(respuesta.status).toBe(413);
    expect(respuesta.body.message).toBe("El cuerpo de la request supera el tamaño máximo permitido");
  });

  it("una imagen de más de 64 KB (con el body bajo 100 KB) la rechaza el dominio con 400", async () => {
    const respuesta = await subir({ imagen: comoDataUrl(Buffer.concat([JPEG, Buffer.alloc(65 * 1024)])) });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.message).toBe("La foto no puede superar los 64 KB");
  });

  it("quitar la foto vuelve a null y la ruta deja de servirla (404)", async () => {
    const respuesta = await request(app).delete("/perfil/foto").set("Authorization", `Bearer ${carla.token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.foto).toBeNull();
    expect((await request(app).get(`/usuarios/${carla.usuario.id}/foto`)).status).toBe(404);
  });

  it("pedir la foto con un id que no es UUID da 400, y de un usuario que no existe, 404", async () => {
    expect((await request(app).get("/usuarios/no-es-un-id/foto")).status).toBe(400);
    expect((await request(app).get(`/usuarios/${randomUUID()}/foto`)).status).toBe(404);
  });
});
