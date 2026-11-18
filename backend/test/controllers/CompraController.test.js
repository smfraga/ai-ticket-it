import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseController } from "../../controllers/BaseController.js";
import { CompraController } from "../../controllers/CompraController.js";
import { ConflictError, ForbiddenError, ValidationError } from "../../errors/AppError.js";

const EVENTO_ID = "3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a13";
const TIPO_ID = "7a1d2c3b-4e5f-4a6b-9c8d-0e1f2a3b4c5d";

function crearRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("CompraController", () => {
  let service;
  let controller;
  let res;
  let next;

  beforeEach(() => {
    service = {
      comprar: jest.fn().mockResolvedValue({ id: "c1" }),
      cancelar: jest.fn().mockResolvedValue({ id: "c1", estado: "REEMBOLSADA" }),
      utilizar: jest.fn().mockResolvedValue({ id: "c1", estado: "UTILIZADA" }),
      listarDelComprador: jest.fn().mockResolvedValue([{ id: "c1" }]),
      listarDeEvento: jest.fn().mockResolvedValue({ compras: [] }),
    };
    controller = new CompraController(service);
    res = crearRes();
    next = jest.fn();
  });

  it("extiende BaseController", () => {
    expect(controller).toBeInstanceOf(BaseController);
  });

  describe("comprar", () => {
    const req = () => ({
      usuario: { id: "carla" },
      params: { id: EVENTO_ID },
      body: { tipoEntradaId: TIPO_ID, cantidad: 2 },
    });

    it("pasa usuario, evento y body al service y responde 201", async () => {
      await controller.comprar(req(), res, next);

      expect(service.comprar).toHaveBeenCalledWith("carla", EVENTO_ID, { tipoEntradaId: TIPO_ID, cantidad: 2 });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: "c1" });
      expect(next).not.toHaveBeenCalled();
    });

    it("400 si el id del evento no es UUID, sin llamar al service", async () => {
      await controller.comprar({ ...req(), params: { id: "abc" } }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
      expect(service.comprar).not.toHaveBeenCalled();
    });

    it("pasa a next el error del service (409)", async () => {
      service.comprar.mockRejectedValue(new ConflictError("sin cupo"));

      await controller.comprar(req(), res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ConflictError);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ["cancelar", "REEMBOLSADA"],
    ["utilizar", "UTILIZADA"],
  ])("%s", (accion, estado) => {
    it("pasa usuario y compra al service y responde 200", async () => {
      await controller[accion]({ usuario: { id: "carla" }, params: { id: EVENTO_ID } }, res, next);

      expect(service[accion]).toHaveBeenCalledWith("carla", EVENTO_ID);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: "c1", estado });
      expect(next).not.toHaveBeenCalled();
    });

    it("400 si el id no es UUID, sin llamar al service", async () => {
      await controller[accion]({ usuario: { id: "carla" }, params: { id: "abc" } }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
      expect(service[accion]).not.toHaveBeenCalled();
    });

    it("pasa a next el error del service (403 o 409)", async () => {
      service[accion].mockRejectedValue(new ConflictError("estado inválido"));

      await controller[accion]({ usuario: { id: "carla" }, params: { id: EVENTO_ID } }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ConflictError);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getMisCompras", () => {
    it("lista las compras del usuario del token y responde 200", async () => {
      await controller.getMisCompras({ usuario: { id: "carla" } }, res, next);

      expect(service.listarDelComprador).toHaveBeenCalledWith("carla");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id: "c1" }]);
    });

    it("pasa a next el error del service", async () => {
      service.listarDelComprador.mockRejectedValue(new Error("falla"));

      await controller.getMisCompras({ usuario: { id: "carla" } }, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("getDeEvento", () => {
    it("lista las compras del evento y responde 200", async () => {
      await controller.getDeEvento({ usuario: { id: "olivia" }, params: { id: EVENTO_ID } }, res, next);

      expect(service.listarDeEvento).toHaveBeenCalledWith("olivia", EVENTO_ID);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ compras: [] });
    });

    it("400 si el id no es UUID", async () => {
      await controller.getDeEvento({ usuario: { id: "olivia" }, params: { id: "abc" } }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
      expect(service.listarDeEvento).not.toHaveBeenCalled();
    });

    it("pasa a next el 403 del service", async () => {
      service.listarDeEvento.mockRejectedValue(new ForbiddenError("no sos el organizador"));

      await controller.getDeEvento({ usuario: { id: "octavio" }, params: { id: EVENTO_ID } }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
    });
  });
});
