import { describe, expect, it, jest } from "@jest/globals";
import { EventEmitter } from "node:events";
import { TooManyRequestsError } from "../../errors/AppError.js";
import { limitarIntentos } from "../../middlewares/limitarIntentos.js";

function pedido(ip = "1.1.1.1") {
  const req = { ip };
  const res = Object.assign(new EventEmitter(), { statusCode: 200, set: jest.fn() });
  const next = jest.fn();
  return { req, res, next };
}

// Hace un pedido completo: pasa por el middleware y, al terminar, emite "finish" con ese status.
function intentar(middleware, { ip, statusCode = 200 } = {}) {
  const { req, res, next } = pedido(ip);
  middleware(req, res, next);
  res.statusCode = statusCode;
  res.emit("finish");
  return { res, error: next.mock.calls[0][0] };
}

describe("limitarIntentos", () => {
  it("deja pasar hasta el máximo y después responde 429 con Retry-After", () => {
    let ahora = 0;
    const middleware = limitarIntentos({ maximo: 2, ventanaMs: 60_000, ahora: () => ahora });

    expect(intentar(middleware).error).toBeUndefined();
    expect(intentar(middleware).error).toBeUndefined();
    ahora = 15_000;
    const { res, error } = intentar(middleware);

    expect(error).toBeInstanceOf(TooManyRequestsError);
    expect(error.statusCode).toBe(429);
    expect(res.set).toHaveBeenCalledWith("Retry-After", "45");
  });

  it("vuelve a dejar pasar cuando termina la ventana", () => {
    let ahora = 0;
    const middleware = limitarIntentos({ maximo: 1, ventanaMs: 60_000, ahora: () => ahora });
    intentar(middleware);
    expect(intentar(middleware).error).toBeInstanceOf(TooManyRequestsError);

    ahora = 60_000;

    expect(intentar(middleware).error).toBeUndefined();
  });

  it("cuenta cada IP por separado", () => {
    const middleware = limitarIntentos({ maximo: 1, ventanaMs: 60_000 });
    intentar(middleware, { ip: "1.1.1.1" });

    expect(intentar(middleware, { ip: "1.1.1.1" }).error).toBeInstanceOf(TooManyRequestsError);
    expect(intentar(middleware, { ip: "2.2.2.2" }).error).toBeUndefined();
  });

  it("sin soloFallidos, cuenta también los pedidos exitosos", () => {
    const middleware = limitarIntentos({ maximo: 2, ventanaMs: 60_000 });

    intentar(middleware, { statusCode: 200 });
    intentar(middleware, { statusCode: 200 });

    expect(intentar(middleware, { statusCode: 200 }).error).toBeInstanceOf(TooManyRequestsError);
  });

  it("con soloFallidos, los pedidos exitosos no cuentan", () => {
    const middleware = limitarIntentos({ maximo: 2, ventanaMs: 60_000, soloFallidos: true });

    for (let i = 0; i < 5; i++) intentar(middleware, { statusCode: 200 });
    intentar(middleware, { statusCode: 401 });
    intentar(middleware, { statusCode: 401 });

    expect(intentar(middleware, { statusCode: 200 }).error).toBeInstanceOf(TooManyRequestsError);
  });

  it("con soloFallidos, una ráfaga en paralelo no supera el máximo", () => {
    const middleware = limitarIntentos({ maximo: 2, ventanaMs: 60_000, soloFallidos: true });
    const enCurso = [pedido(), pedido(), pedido()];

    enCurso.forEach(({ req, res, next }) => middleware(req, res, next));

    expect(enCurso[0].next).toHaveBeenCalledWith();
    expect(enCurso[1].next).toHaveBeenCalledWith();
    expect(enCurso[2].next.mock.calls[0][0]).toBeInstanceOf(TooManyRequestsError);
  });
});
