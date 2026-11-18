import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseController } from "../../controllers/BaseController.js";
import { FavoritoController } from "../../controllers/FavoritoController.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../../errors/AppError.js";

const ID_VALIDO = "3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a13";

function crearRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
}

describe("FavoritoController", () => {
  let service;
  let controller;
  let res;
  let next;

  beforeEach(() => {
    service = {
      guardar: jest.fn().mockResolvedValue({ agregado: true, evento: { id: "e1" } }),
      quitar: jest.fn().mockResolvedValue(undefined),
      listar: jest.fn().mockResolvedValue([{ id: "e1" }]),
    };
    controller = new FavoritoController(service);
    res = crearRes();
    next = jest.fn();
  });

  it("extiende BaseController", () => {
    expect(controller).toBeInstanceOf(BaseController);
  });

  describe("guardar", () => {
    const req = () => ({ usuario: { id: "carla" }, params: { id: ID_VALIDO } });

    it("responde 201 con el evento cuando es un favorito nuevo", async () => {
      await controller.guardar(req(), res, next);

      expect(service.guardar).toHaveBeenCalledWith("carla", ID_VALIDO);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: "e1" });
      expect(next).not.toHaveBeenCalled();
    });

    it("responde 200 con el evento si ya era favorito", async () => {
      service.guardar.mockResolvedValue({ agregado: false, evento: { id: "e1" } });

      await controller.guardar(req(), res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: "e1" });
    });

    it("400 si el id no es UUID, sin llamar al service", async () => {
      await controller.guardar({ ...req(), params: { id: "abc" } }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
      expect(service.guardar).not.toHaveBeenCalled();
    });

    it("pasa a next el 403 del service", async () => {
      service.guardar.mockRejectedValue(new ForbiddenError("Solo un comprador"));

      await controller.guardar(req(), res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("quitar", () => {
    const req = () => ({ usuario: { id: "carla" }, params: { id: ID_VALIDO } });

    it("responde 204 sin cuerpo", async () => {
      await controller.quitar(req(), res, next);

      expect(service.quitar).toHaveBeenCalledWith("carla", ID_VALIDO);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("400 si el id no es UUID, sin llamar al service", async () => {
      await controller.quitar({ ...req(), params: { id: "abc" } }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
      expect(service.quitar).not.toHaveBeenCalled();
    });

    it("pasa a next el 404 del service", async () => {
      service.quitar.mockRejectedValue(new NotFoundError("El evento no existe"));

      await controller.quitar(req(), res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("getFavoritos", () => {
    it("lista los favoritos del usuario del token y responde 200", async () => {
      await controller.getFavoritos({ usuario: { id: "carla" } }, res, next);

      expect(service.listar).toHaveBeenCalledWith("carla");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id: "e1" }]);
    });

    it("pasa a next el 403 del service", async () => {
      service.listar.mockRejectedValue(new ForbiddenError("Solo un comprador"));

      await controller.getFavoritos({ usuario: { id: "olivia" } }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
