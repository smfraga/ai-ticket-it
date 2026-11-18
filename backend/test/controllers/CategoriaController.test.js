import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseController } from "../../controllers/BaseController.js";
import { CategoriaController } from "../../controllers/CategoriaController.js";

function crearRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("CategoriaController", () => {
  let service;
  let controller;
  let res;
  let next;

  beforeEach(() => {
    service = { getAll: jest.fn().mockResolvedValue([{ id: "c1", nombre: "Rock" }]) };
    controller = new CategoriaController(service);
    res = crearRes();
    next = jest.fn();
  });

  it("extiende BaseController", () => {
    expect(controller).toBeInstanceOf(BaseController);
  });

  it("responde 200 con las categorías", async () => {
    await controller.getAll({}, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: "c1", nombre: "Rock" }]);
    expect(next).not.toHaveBeenCalled();
  });

  it("pasa a next el error del service", async () => {
    const error = new Error("falló");
    service.getAll.mockRejectedValue(error);

    await controller.getAll({}, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
