import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AuthController } from "../../controllers/AuthController.js";
import { BaseController } from "../../controllers/BaseController.js";
import { ConflictError, UnauthorizedError } from "../../errors/AppError.js";

function crearRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("AuthController", () => {
  let service;
  let controller;
  let res;
  let next;
  const sesion = { token: "token-de-prueba", usuario: { id: "u-1" } };

  beforeEach(() => {
    service = {
      registro: jest.fn().mockResolvedValue(sesion),
      login: jest.fn().mockResolvedValue(sesion),
    };
    controller = new AuthController(service);
    res = crearRes();
    next = jest.fn();
  });

  it("extiende BaseController", () => {
    expect(controller).toBeInstanceOf(BaseController);
  });

  describe("registro", () => {
    it("responde 201 con la sesión que devuelve el service", async () => {
      const req = { body: { email: "ana@example.com" } };

      await controller.registro(req, res, next);

      expect(service.registro).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(sesion);
      expect(next).not.toHaveBeenCalled();
    });

    it("pasa el error al middleware si el service falla", async () => {
      const error = new ConflictError("Ya existe un usuario con ese email");
      service.registro.mockRejectedValue(error);

      await controller.registro({ body: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("responde 200 con la sesión que devuelve el service", async () => {
      const req = { body: { email: "ana@example.com", password: "x" } };

      await controller.login(req, res, next);

      expect(service.login).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(sesion);
      expect(next).not.toHaveBeenCalled();
    });

    it("pasa el error al middleware si las credenciales son inválidas", async () => {
      const error = new UnauthorizedError("Email o contraseña incorrectos");
      service.login.mockRejectedValue(error);

      await controller.login({ body: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
