import { describe, expect, it } from "@jest/globals";
import { MAXIMO_DE_IMAGENES, TAMANIO_MAXIMO_DE_IMAGEN } from "../../domain/Evento.js";
import { tipoDeImagen } from "../../domain/Imagen.js";
import { ConflictError, ForbiddenError, ValidationError } from "../../errors/AppError.js";
import { AHORA, crearEvento, crearOrganizador, enDias } from "../helpers/domainFactories.js";

// Bytes con la firma de cada formato (el resto del contenido no importa para el dominio).
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const URL_DEL_SEED = "https://images.unsplash.com/foto.jpg";

function eventoGuardado(cambios = {}) {
  const evento = crearEvento(cambios);
  evento.id = "e-1";
  return evento;
}

describe("tipoDeImagen", () => {
  it("reconoce JPEG y PNG por sus primeros bytes", () => {
    expect(tipoDeImagen(JPEG)).toBe("image/jpeg");
    expect(tipoDeImagen(PNG)).toBe("image/png");
  });

  it("devuelve null para otros formatos o una firma incompleta", () => {
    expect(tipoDeImagen(Buffer.from("GIF89a"))).toBeNull();
    expect(tipoDeImagen(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(tipoDeImagen(PNG.subarray(0, 7))).toBeNull();
  });
});

describe("Evento.agregarImagen", () => {
  it("guarda los bytes y suma su ruta al final de multimedia", () => {
    const evento = eventoGuardado({ multimedia: [URL_DEL_SEED] });

    evento.agregarImagen(JPEG, "img-1", evento.organizador, AHORA);
    evento.agregarImagen(PNG, "img-2", evento.organizador, AHORA);

    expect(evento.multimedia).toEqual([URL_DEL_SEED, "/eventos/e-1/imagenes/img-1", "/eventos/e-1/imagenes/img-2"]);
    expect(evento.imagen("img-1")).toEqual({ tipo: "image/jpeg", datos: JPEG });
    expect(evento.imagen("img-2")).toEqual({ tipo: "image/png", datos: PNG });
  });

  it("imagen devuelve null si no existe", () => {
    expect(eventoGuardado().imagen("otra")).toBeNull();
  });

  it("403 si no es el organizador del evento", () => {
    const evento = eventoGuardado();

    expect(() => evento.agregarImagen(JPEG, "img", crearOrganizador(), AHORA)).toThrow(ForbiddenError);
    expect(evento.multimedia).toEqual([]);
  });

  it("409 si el evento está cancelado o ya se realizó", () => {
    const cancelado = eventoGuardado();
    cancelado.cancelar(cancelado.organizador, AHORA);
    const pasado = eventoGuardado({ fecha: enDias(1) });

    expect(() => cancelado.agregarImagen(JPEG, "img", cancelado.organizador, AHORA)).toThrow(ConflictError);
    expect(() => pasado.agregarImagen(JPEG, "img", pasado.organizador, enDias(1))).toThrow(ConflictError);
  });

  it.each([
    ["no son bytes", "una imagen"],
    ["está vacía", Buffer.alloc(0)],
    ["no es JPEG ni PNG", Buffer.from("GIF89a....")],
  ])("400 si la imagen %s", (_, datos) => {
    const evento = eventoGuardado();

    expect(() => evento.agregarImagen(datos, "img", evento.organizador, AHORA)).toThrow(ValidationError);
    expect(evento.multimedia).toEqual([]);
  });

  it("acepta hasta 400 KB y rechaza un byte más con 400", () => {
    const evento = eventoGuardado();
    const justo = Buffer.concat([JPEG, Buffer.alloc(TAMANIO_MAXIMO_DE_IMAGEN - JPEG.length)]);
    const deMas = Buffer.concat([justo, Buffer.alloc(1)]);

    expect(() => evento.agregarImagen(deMas, "img-2", evento.organizador, AHORA)).toThrow(
      "La imagen no puede superar los 400 KB",
    );
    evento.agregarImagen(justo, "img-1", evento.organizador, AHORA);
    expect(evento.imagen("img-1")).not.toBeNull();
  });

  it("409 al llegar a 6 imágenes, contando también las URLs", () => {
    const evento = eventoGuardado({ multimedia: [URL_DEL_SEED, URL_DEL_SEED] });
    for (let i = 0; i < MAXIMO_DE_IMAGENES - 2; i++) {
      evento.agregarImagen(JPEG, `img-${i}`, evento.organizador, AHORA);
    }

    expect(evento.multimedia).toHaveLength(6);
    expect(() => evento.agregarImagen(JPEG, "img-7", evento.organizador, AHORA)).toThrow(ConflictError);
    expect(evento.imagen("img-7")).toBeNull();
  });
});

describe("Evento: multimedia con imágenes adjuntas", () => {
  it("no se puede crear ni editar con más de 6 imágenes", () => {
    const siete = Array(7).fill(URL_DEL_SEED);
    const evento = eventoGuardado();

    expect(() => crearEvento({ multimedia: siete })).toThrow("El evento puede tener hasta 6 imágenes");
    expect(() => evento.editar({ multimedia: siete }, evento.organizador, AHORA)).toThrow(ValidationError);
    expect(() => crearEvento({ multimedia: Array(6).fill(URL_DEL_SEED) })).not.toThrow();
  });

  it("al editar se conservan las que siguen en la lista y se descartan los bytes de las que salieron", () => {
    const evento = eventoGuardado({ multimedia: [URL_DEL_SEED] });
    evento.agregarImagen(JPEG, "img-1", evento.organizador, AHORA);
    evento.agregarImagen(PNG, "img-2", evento.organizador, AHORA);

    evento.editar({ multimedia: ["/eventos/e-1/imagenes/img-2"] }, evento.organizador, AHORA);

    expect(evento.multimedia).toEqual(["/eventos/e-1/imagenes/img-2"]);
    expect(evento.imagen("img-1")).toBeNull();
    expect(evento.imagen("img-2")).toEqual({ tipo: "image/png", datos: PNG });
  });

  it("editar otros datos no toca las imágenes", () => {
    const evento = eventoGuardado();
    evento.agregarImagen(JPEG, "img-1", evento.organizador, AHORA);

    evento.editar({ nombre: "Otro nombre" }, evento.organizador, AHORA);

    expect(evento.imagen("img-1")).not.toBeNull();
  });

  it.each([
    ["una imagen que no existe", "/eventos/e-1/imagenes/no-existe"],
    ["una imagen de otro evento", "/eventos/e-2/imagenes/img-1"],
  ])("400 si se intenta conservar %s, y no cambia nada", (_, ruta) => {
    const evento = eventoGuardado();
    evento.agregarImagen(JPEG, "img-1", evento.organizador, AHORA);

    expect(() => evento.editar({ nombre: "Nuevo", multimedia: [ruta] }, evento.organizador, AHORA)).toThrow(
      "Una de las imágenes no pertenece al evento",
    );
    expect(evento.nombre).not.toBe("Nuevo");
    expect(evento.imagen("img-1")).not.toBeNull();
  });
});
