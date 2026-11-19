import { describe, expect, it } from "@jest/globals";
import { TAMANIO_MAXIMO_DE_FOTO } from "../../domain/Usuario.js";
import { ValidationError } from "../../errors/AppError.js";
import { crearComprador } from "../helpers/domainFactories.js";

// Bytes con la firma de cada formato (el resto no importa para la regla).
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const GIF = Buffer.from("GIF89a....");

describe("Usuario: foto de perfil", () => {
  it("un usuario nuevo no tiene foto", () => {
    expect(crearComprador().foto).toBeNull();
  });

  it("guarda un JPEG o un PNG con su tipo, decidido por los primeros bytes", () => {
    const carla = crearComprador();

    carla.cambiarFoto(JPEG);
    expect(carla.foto).toMatchObject({ tipo: "image/jpeg", datos: JPEG });

    carla.cambiarFoto(PNG);
    expect(carla.foto).toMatchObject({ tipo: "image/png", datos: PNG });
  });

  it("cada cambio sube la versión (para que el celular no muestre una foto vieja)", () => {
    const carla = crearComprador();

    carla.cambiarFoto(JPEG);
    const primera = carla.foto.version;
    carla.cambiarFoto(JPEG);

    expect(carla.foto.version).toBe(primera + 1);
  });

  it.each([
    ["algo que no es una imagen", GIF, "La foto tiene que ser una imagen JPEG o PNG"],
    // Empieza como un JPEG pero la firma no está completa (archivo truncado o con la extensión cambiada).
    [
      "una firma de JPEG incompleta",
      Buffer.from([0xff, 0xd8, 0x00, 0xe0]),
      "La foto tiene que ser una imagen JPEG o PNG",
    ],
    [
      "una firma de PNG incompleta",
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00]),
      "La foto tiene que ser una imagen JPEG o PNG",
    ],
    ["un archivo vacío", Buffer.alloc(0), "Hay que mandar una imagen"],
    ["un texto en lugar de bytes", "no es un buffer", "Hay que mandar una imagen"],
  ])("rechaza %s (400) y conserva la foto anterior", (_, datos, mensaje) => {
    const carla = crearComprador();
    carla.cambiarFoto(JPEG);

    expect(() => carla.cambiarFoto(datos)).toThrow(ValidationError);
    expect(() => carla.cambiarFoto(datos)).toThrow(mensaje);
    expect(carla.foto.datos).toBe(JPEG);
  });

  it("acepta hasta 64 KB y rechaza un byte más", () => {
    const justa = Buffer.concat([JPEG, Buffer.alloc(TAMANIO_MAXIMO_DE_FOTO - JPEG.length)]);
    const grande = Buffer.concat([justa, Buffer.alloc(1)]);
    const carla = crearComprador();

    expect(() => carla.cambiarFoto(justa)).not.toThrow();
    expect(() => carla.cambiarFoto(grande)).toThrow("La foto no puede superar los 64 KB");
  });

  it("quitar la foto vuelve a null y sube la versión; sin foto no cambia nada", () => {
    const carla = crearComprador();
    carla.quitarFoto();
    expect(carla.versionDeFoto).toBe(0);

    carla.cambiarFoto(JPEG);
    carla.quitarFoto();
    expect(carla.foto).toBeNull();
    expect(carla.versionDeFoto).toBe(2);

    carla.cambiarFoto(JPEG);
    expect(carla.foto.version).toBe(3);
  });
});
