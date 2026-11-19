import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { UnauthorizedError, ValidationError } from "../../errors/AppError.js";
import { PerfilService } from "../../services/PerfilService.js";
import { crearComprador } from "../helpers/domainFactories.js";

describe("PerfilService.editar", () => {
  let carla;
  let repositorio;
  let service;

  beforeEach(() => {
    carla = crearComprador({ id: "carla", nombre: "Carla", apellido: "Gómez", email: "carla@example.com" });
    repositorio = {
      findById: jest.fn(async (id) => (id === "carla" ? carla : null)),
      save: jest.fn(async (usuario) => usuario),
    };
    service = new PerfilService(repositorio);
  });

  it("cambia el nombre, lo guarda y devuelve el usuario como en la sesión, sin el hash", async () => {
    const respuesta = await service.editar("carla", { nombre: "Carla María" });

    expect(respuesta).toEqual({
      id: "carla",
      nombre: "Carla María",
      apellido: "Gómez",
      email: "carla@example.com",
      roles: ["COMPRADOR"],
    });
    expect(repositorio.save).toHaveBeenCalledWith(carla);
  });

  it("si los datos son inválidos no guarda nada (400)", async () => {
    await expect(service.editar("carla", { apellido: " " })).rejects.toThrow(ValidationError);
    expect(repositorio.save).not.toHaveBeenCalled();
    expect(carla.apellido).toBe("Gómez");
  });

  it("si el usuario del token ya no existe (servidor reiniciado), pide iniciar sesión de nuevo (401)", async () => {
    await expect(service.editar("borrado", { nombre: "X" })).rejects.toThrow(UnauthorizedError);
  });
});
