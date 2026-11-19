import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NotFoundError, UnauthorizedError, ValidationError } from "../../errors/AppError.js";
import { PerfilService } from "../../services/PerfilService.js";
import { crearComprador } from "../helpers/domainFactories.js";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const dataUrl = (bytes) => `data:image/jpeg;base64,${bytes.toString("base64")}`;

describe("PerfilService: foto de perfil", () => {
  let carla;
  let repositorio;
  let service;

  beforeEach(() => {
    carla = crearComprador({ id: "carla" });
    repositorio = {
      findById: jest.fn(async (id) => (id === "carla" ? carla : null)),
      save: jest.fn(async (usuario) => usuario),
    };
    service = new PerfilService(repositorio);
  });

  it("decodifica el base64, guarda los bytes y devuelve la ruta con la versión", async () => {
    const respuesta = await service.cambiarFoto("carla", dataUrl(JPEG));

    expect(Buffer.compare(carla.foto.datos, JPEG)).toBe(0);
    expect(respuesta.foto).toBe("/usuarios/carla/foto?v=1");
    expect(repositorio.save).toHaveBeenCalledWith(carla);
  });

  it("si los bytes no son una imagen válida, no guarda (400)", async () => {
    await expect(service.cambiarFoto("carla", dataUrl(Buffer.from("no es imagen")))).rejects.toThrow(ValidationError);
    expect(repositorio.save).not.toHaveBeenCalled();
  });

  it("quitar la foto la deja en null y lo guarda", async () => {
    carla.cambiarFoto(JPEG);

    const respuesta = await service.quitarFoto("carla");

    expect(respuesta.foto).toBeNull();
    expect(repositorio.save).toHaveBeenCalledWith(carla);
  });

  it("fotoDe devuelve el tipo y los bytes, y 404 si no tiene foto o no existe", async () => {
    await expect(service.fotoDe("carla")).rejects.toThrow(NotFoundError);
    await expect(service.fotoDe("nadie")).rejects.toThrow(NotFoundError);

    carla.cambiarFoto(JPEG);

    expect(await service.fotoDe("carla")).toEqual({ tipo: "image/jpeg", datos: JPEG });
  });

  it("subir o quitar con un usuario que ya no existe pide iniciar sesión de nuevo (401)", async () => {
    await expect(service.cambiarFoto("borrado", dataUrl(JPEG))).rejects.toThrow(UnauthorizedError);
    await expect(service.quitarFoto("borrado")).rejects.toThrow(UnauthorizedError);
  });
});
