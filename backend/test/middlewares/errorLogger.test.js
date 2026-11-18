import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { app } from "../../app.js";
import { AppError, ConflictError, ForbiddenError, ValidationError } from "../../errors/AppError.js";
import { errorHandler } from "../../middlewares/errorHandler.js";
import { crearErrorLogger } from "../../middlewares/errorLogger.js";

describe("errorLogger", () => {
  let logger;
  let errorLogger;
  let req;
  let next;

  beforeEach(() => {
    logger = { error: jest.fn(), warn: jest.fn() };
    errorLogger = crearErrorLogger(logger);
    req = {
      method: "POST",
      originalUrl: "/compras/abc/mensajes",
      body: { password: "secreta", mensaje: "hola" },
      headers: { authorization: "Bearer token-secreto" },
    };
    next = jest.fn();
  });

  it("un error inesperado (500) se registra con error, la ruta y el stack", () => {
    const err = new Error("se rompió algo");

    errorLogger(err, req, {}, next);

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [linea, stack] = logger.error.mock.calls[0];
    expect(linea).toContain("POST /compras/abc/mensajes -> 500");
    expect(stack).toBe(err.stack);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("un AppError 5xx se registra con error, su propio status y el stack", () => {
    const err = new AppError("falló el servicio", 503);

    errorLogger(err, req, {}, next);

    expect(logger.error.mock.calls[0][0]).toContain("-> 503");
    expect(logger.error.mock.calls[0][1]).toBe(err.stack);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each([
    ["ValidationError", new ValidationError("Datos inválidos"), 400],
    ["ForbiddenError", new ForbiddenError("No podés hacer eso"), 403],
    ["ConflictError", new ConflictError("Ya existe"), 409],
  ])("%s (4xx) se registra con warn en una línea, con el status y el mensaje", (_n, err, status) => {
    errorLogger(err, req, {}, next);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const [linea] = logger.warn.mock.calls[0];
    expect(linea).toContain(`POST /compras/abc/mensajes -> ${status}: ${err.message}`);
    expect(linea).not.toContain("\n");
    expect(logger.warn.mock.calls[0]).toHaveLength(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("un error de express.json (JSON mal formado) cuenta como 4xx", () => {
    const err = Object.assign(new SyntaxError("Unexpected token"), {
      expose: true,
      status: 400,
      type: "entity.parse.failed",
    });

    errorLogger(err, req, {}, next);

    expect(logger.warn.mock.calls[0][0]).toContain("-> 400: Unexpected token");
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("siempre pasa el mismo error al siguiente middleware", () => {
    const inesperado = new Error("boom");
    const esperado = new ConflictError("ya existe");

    errorLogger(inesperado, req, {}, next);
    errorLogger(esperado, req, {}, next);

    expect(next).toHaveBeenNthCalledWith(1, inesperado);
    expect(next).toHaveBeenNthCalledWith(2, esperado);
  });

  it("nunca registra el body ni los headers de la request", () => {
    errorLogger(new Error("boom"), req, {}, next);
    errorLogger(new ValidationError("Datos inválidos"), req, {}, next);

    const todo = JSON.stringify([...logger.error.mock.calls, ...logger.warn.mock.calls]);
    expect(todo).not.toContain("secreta");
    expect(todo).not.toContain("token-secreto");
  });

  it("incluye la fecha en formato ISO", () => {
    errorLogger(new ValidationError("Datos inválidos"), req, {}, next);

    expect(logger.warn.mock.calls[0][0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\]/);
  });

  describe("registro en app.js", () => {
    // En los tests el logger real está silenciado, así que se comprueba el orden de la pila de middlewares:
    // tiene que ir después de las rutas y antes del errorHandler, que es quien responde y corta la cadena.
    it("está registrado después de notFoundHandler y antes de errorHandler", () => {
      const capas = app.router.stack.map((capa) => capa.handle?.name);

      expect(capas).toContain("errorLogger");
      expect(capas.indexOf("errorLogger")).toBeGreaterThan(capas.indexOf("notFoundHandler"));
      expect(capas.indexOf("errorLogger")).toBeLessThan(capas.indexOf("errorHandler"));
    });
  });

  describe("junto con el errorHandler en una app de Express", () => {
    const armarApp = (errorALanzar) => {
      const app = express();
      app.get("/falla", (_req, _res, nextRuta) => nextRuta(errorALanzar));
      app.use(errorLogger);
      app.use(errorHandler);
      return app;
    };

    it("registra el 500 y el cliente sigue recibiendo el mensaje genérico, sin el stack", async () => {
      const respuesta = await request(armarApp(new Error("detalle interno"))).get("/falla");

      expect(respuesta.status).toBe(500);
      expect(respuesta.body.message).toBe("Error interno del servidor");
      expect(JSON.stringify(respuesta.body)).not.toContain("detalle interno");
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error.mock.calls[0][0]).toContain("GET /falla -> 500");
    });

    it("registra el 4xx y el cliente recibe el status y el mensaje del error", async () => {
      const respuesta = await request(armarApp(new ConflictError("Ya existe"))).get("/falla");

      expect(respuesta.status).toBe(409);
      expect(respuesta.body.message).toBe("Ya existe");
      expect(logger.warn.mock.calls[0][0]).toContain("GET /falla -> 409: Ya existe");
    });
  });
});
