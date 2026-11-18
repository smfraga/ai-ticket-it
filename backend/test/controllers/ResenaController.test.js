import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseController } from "../../controllers/BaseController.js";
import { ResenaController } from "../../controllers/ResenaController.js";
import { ConflictError, NotFoundError, ValidationError } from "../../errors/AppError.js";

const ID_VALIDO = "3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a13";

function crearRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("ResenaController", () => {
  let service;
  let controller;
  let res;
  let next;

  beforeEach(() => {
    service = {
      resenar: jest.fn().mockResolvedValue({ id: "r1" }),
      listarDeEvento: jest.fn().mockResolvedValue({ resenias: [] }),
      listarDeOrganizador: jest.fn().mockResolvedValue({ resenias: [] }),
    };
    controller = new ResenaController(service);
    res = crearRes();
    next = jest.fn();
  });

  it("extiende BaseController", () => {
    expect(controller).toBeInstanceOf(BaseController);
  });

  describe("resenar", () => {
    const req = () => ({
      usuario: { id: "carla" },
      params: { id: ID_VALIDO },
      body: { puntuacion: 5, detalle: "Impecable" },
    });

    it("pasa usuario, compra y datos al service y responde 201", async () => {
      await controller.resenar(req(), res, next);

      expect(service.resenar).toHaveBeenCalledWith("carla", ID_VALIDO, { puntuacion: 5, detalle: "Impecable" });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: "r1" });
      expect(next).not.toHaveBeenCalled();
    });

    it("400 si el id no es UUID, sin llamar al service", async () => {
      await controller.resenar({ ...req(), params: { id: "abc" } }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
      expect(service.resenar).not.toHaveBeenCalled();
    });

    it("pasa a next el error del service (409)", async () => {
      service.resenar.mockRejectedValue(new ConflictError("Esta compra ya tiene una reseña"));

      await controller.resenar(req(), res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ConflictError);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ["getDeEvento", "listarDeEvento"],
    ["getDeOrganizador", "listarDeOrganizador"],
  ])("%s", (metodo, delService) => {
    it("pide las reseñas al service y responde 200", async () => {
      await controller[metodo]({ params: { id: ID_VALIDO } }, res, next);

      expect(service[delService]).toHaveBeenCalledWith(ID_VALIDO);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ resenias: [] });
    });

    it("400 si el id no es UUID, sin llamar al service", async () => {
      await controller[metodo]({ params: { id: "abc" } }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
      expect(service[delService]).not.toHaveBeenCalled();
    });

    it("pasa a next el 404 del service", async () => {
      service[delService].mockRejectedValue(new NotFoundError("no existe"));

      await controller[metodo]({ params: { id: ID_VALIDO } }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
