import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../../errors/AppError.js";
import { autenticar } from "../../middlewares/autenticar.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

const USUARIO_ID = "usuario-1";
const claims = { roles: ["COMPRADOR", "ORGANIZADOR"] };

function firmar(opciones = {}, secreto = SECRETO_DE_PRUEBA, payload = claims) {
  return jwt.sign(payload, secreto, {
    subject: USUARIO_ID,
    algorithm: "HS256",
    expiresIn: "1h",
    ...opciones,
  });
}

function ejecutar(authorization) {
  const req = { headers: authorization === undefined ? {} : { authorization } };
  const next = jest.fn();
  autenticar(req, {}, next);
  return { req, next, error: next.mock.calls[0][0] };
}

describe("autenticar", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
  });

  it("con un token válido deja req.usuario con id y roles, y sigue sin error", () => {
    const { req, next } = ejecutar(`Bearer ${firmar()}`);

    expect(next).toHaveBeenCalledWith();
    expect(req.usuario).toEqual({ id: USUARIO_ID, roles: ["COMPRADOR", "ORGANIZADOR"] });
  });

  it("si el token no trae roles, deja una lista vacía", () => {
    const { req } = ejecutar(`Bearer ${firmar({}, SECRETO_DE_PRUEBA, {})}`);

    expect(req.usuario.roles).toEqual([]);
  });

  it.each([
    ["no hay header", undefined],
    ["el header está vacío", ""],
    ["el esquema es Basic", "Basic am9objpwYXNzd29yZA=="],
    ["falta el espacio después de Bearer", `Bearer${firmar()}`],
  ])("pasa un 401 si %s", (_, authorization) => {
    const { req, error } = ejecutar(authorization);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("Falta el token de sesión");
    expect(req.usuario).toBeUndefined();
  });

  it("pasa un 401 'La sesión expiró' si el token venció", () => {
    const { req, error } = ejecutar(`Bearer ${firmar({ expiresIn: -10 })}`);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.message).toBe("La sesión expiró");
    expect(req.usuario).toBeUndefined();
  });

  it.each([
    ["está firmado con otro secreto", () => firmar({}, "otro-secreto")],
    ["no es un JWT", () => "esto-no-es-un-token"],
    [
      "le cambiaron el payload",
      () => {
        const [header, , firma] = firmar().split(".");
        const payloadFalso = Buffer.from(JSON.stringify({ roles: ["ORGANIZADOR"], sub: "otro-usuario" })).toString(
          "base64url",
        );
        return `${header}.${payloadFalso}.${firma}`;
      },
    ],
    ["no tiene firma (alg: none)", () => jwt.sign({ ...claims, sub: USUARIO_ID }, null, { algorithm: "none" })],
    ["está firmado con HS512 en lugar de HS256", () => firmar({ algorithm: "HS512" })],
  ])("pasa un 401 'Token inválido' si el token %s", (_, crearToken) => {
    const { req, error } = ejecutar(`Bearer ${crearToken()}`);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.message).toBe("Token inválido");
    expect(req.usuario).toBeUndefined();
  });
});
