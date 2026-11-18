import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseController } from "../../controllers/BaseController.js";
import { EventoController } from "../../controllers/EventoController.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../../errors/AppError.js";

const ID_VALIDO = "3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a13";

function crearRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("EventoController", () => {
  let service;
  let controller;
  let res;
  let next;

  beforeEach(() => {
    service = {
      buscar: jest.fn().mockResolvedValue([{ id: "e1" }]),
      getById: jest.fn().mockResolvedValue({ id: ID_VALIDO }),
      crear: jest.fn().mockResolvedValue({ id: "nuevo" }),
    };
    controller = new EventoController(service);
    res = crearRes();
    next = jest.fn();
  });

  it("extiende BaseController", () => {
    expect(controller).toBeInstanceOf(BaseController);
  });

  describe("getAll", () => {
    it("valida la query, se la pasa al service ya transformada y responde 200", async () => {
      const req = { query: { texto: " rock ", precioMin: "1000", orden: "precio", direccion: "desc" } };

      await controller.getAll(req, res, next);

      expect(service.buscar).toHaveBeenCalledWith({
        texto: "rock",
        precioMin: 1000,
        periodo: "proximos",
        orden: "precio",
        direccion: "desc",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id: "e1" }]);
      expect(next).not.toHaveBeenCalled();
    });

    it("sin parámetros usa los valores por defecto", async () => {
      await controller.getAll({ query: {} }, res, next);

      expect(service.buscar).toHaveBeenCalledWith({ periodo: "proximos", orden: "fecha" });
    });

    it.each([
      ["un orden desconocido", { orden: "nombre" }],
      ["un rango de precios invertido", { precioMin: "20", precioMax: "10" }],
      ["un parámetro que no existe", { pagina: "2" }],
    ])("con %s pasa un ValidationError a next sin llamar al service", async (_, query) => {
      await controller.getAll({ query }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
      expect(service.buscar).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("pasa a next el error del service", async () => {
      const error = new Error("falló");
      service.buscar.mockRejectedValue(error);

      await controller.getAll({ query: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    it("responde 200 con el evento", async () => {
      await controller.getById({ params: { id: ID_VALIDO } }, res, next);

      expect(service.getById).toHaveBeenCalledWith(ID_VALIDO);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: ID_VALIDO });
    });

    it("con un id que no es UUID pasa un ValidationError a next sin llamar al service", async () => {
      await controller.getById({ params: { id: "123" } }, res, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
      expect(service.getById).not.toHaveBeenCalled();
    });

    it("pasa a next el NotFoundError del service", async () => {
      const error = new NotFoundError("El evento no existe");
      service.getById.mockRejectedValue(error);

      await controller.getById({ params: { id: ID_VALIDO } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    const req = { usuario: { id: "olivia", roles: ["ORGANIZADOR"] }, body: { nombre: "Recital" } };

    it("crea el evento con el usuario del token y responde 201", async () => {
      await controller.create(req, res, next);

      expect(service.crear).toHaveBeenCalledWith("olivia", req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: "nuevo" });
      expect(next).not.toHaveBeenCalled();
    });

    it("pasa a next el error del service (por ejemplo, un usuario que no es organizador)", async () => {
      const error = new ForbiddenError("Solo un usuario organizador puede crear eventos");
      service.crear.mockRejectedValue(error);

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
