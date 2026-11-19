import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Usuario } from "../../domain/Usuario.js";
import { ConflictError, UnauthorizedError, ValidationError } from "../../errors/AppError.js";
import { AuthService, hashearPassword } from "../../services/AuthService.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

const USUARIO_ID = "usuario-1";
const PASSWORD = "una-contraseña-larga";

describe("AuthService", () => {
  let usuarioRepository;
  let service;
  let hashDePassword;

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    hashDePassword = await hashearPassword(PASSWORD);
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    usuarioRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (usuario) => {
        usuario.id = USUARIO_ID;
        return usuario;
      }),
    };
    service = new AuthService(usuarioRepository);
  });

  const datosDeRegistro = (cambios = {}) => ({
    nombre: "Ana",
    apellido: "Pérez",
    email: "ana@example.com",
    password: PASSWORD,
    roles: ["COMPRADOR"],
    ...cambios,
  });

  describe("registro", () => {
    it("guarda un usuario con sus datos y devuelve la sesión", async () => {
      const sesion = await service.registro(datosDeRegistro({ roles: ["COMPRADOR", "ORGANIZADOR"] }));

      const guardado = usuarioRepository.save.mock.calls[0][0];
      expect(guardado).toBeInstanceOf(Usuario);
      expect(guardado.email).toBe("ana@example.com");
      expect(guardado.roles).toEqual(["COMPRADOR", "ORGANIZADOR"]);
      expect(sesion.usuario).toEqual({
        id: USUARIO_ID,
        nombre: "Ana",
        apellido: "Pérez",
        email: "ana@example.com",
        roles: ["COMPRADOR", "ORGANIZADOR"],
        foto: null,
      });
    });

    it("guarda el hash de la contraseña, nunca la contraseña", async () => {
      await service.registro(datosDeRegistro());

      const guardado = usuarioRepository.save.mock.calls[0][0];
      expect(guardado.passwordHash).not.toBe(PASSWORD);
      expect(await bcrypt.compare(PASSWORD, guardado.passwordHash)).toBe(true);
    });

    it("no devuelve el hash ni la contraseña en la sesión", async () => {
      const sesion = await service.registro(datosDeRegistro());

      expect(sesion.usuario).not.toHaveProperty("passwordHash");
      expect(JSON.stringify(sesion)).not.toContain(PASSWORD);
    });

    it("devuelve un token firmado con el id y los roles, sin el email", async () => {
      const { token } = await service.registro(datosDeRegistro({ roles: ["ORGANIZADOR"] }));

      const payload = jwt.verify(token, SECRETO_DE_PRUEBA, { algorithms: ["HS256"] });
      expect(payload.sub).toBe(USUARIO_ID);
      expect(payload.roles).toEqual(["ORGANIZADOR"]);
      expect(payload).not.toHaveProperty("email");
      expect(payload.exp - payload.iat).toBe(3600);
    });

    it("lanza ConflictError si el email ya está registrado, sin guardar nada", async () => {
      usuarioRepository.findByEmail.mockResolvedValue({ id: "otro" });

      await expect(service.registro(datosDeRegistro())).rejects.toThrow(ConflictError);
      await expect(service.registro(datosDeRegistro())).rejects.toThrow("Ya existe un usuario con ese email");
      expect(usuarioRepository.save).not.toHaveBeenCalled();
    });

    it("propaga el error del dominio si los datos son inválidos, sin guardar nada", async () => {
      await expect(service.registro(datosDeRegistro({ roles: [] }))).rejects.toThrow(ValidationError);
      expect(usuarioRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    const usuarioGuardado = () => ({
      id: USUARIO_ID,
      nombre: "Ana",
      apellido: "Pérez",
      email: "ana@example.com",
      passwordHash: hashDePassword,
      roles: ["COMPRADOR"],
    });

    it("devuelve la sesión si la contraseña coincide", async () => {
      usuarioRepository.findByEmail.mockResolvedValue(usuarioGuardado());

      const sesion = await service.login({ email: "ana@example.com", password: PASSWORD });

      expect(sesion.usuario.id).toBe(USUARIO_ID);
      expect(sesion.usuario).not.toHaveProperty("passwordHash");
      expect(jwt.verify(sesion.token, SECRETO_DE_PRUEBA).sub).toBe(USUARIO_ID);
    });

    it("lanza UnauthorizedError si la contraseña es incorrecta", async () => {
      usuarioRepository.findByEmail.mockResolvedValue(usuarioGuardado());

      await expect(service.login({ email: "ana@example.com", password: "otra-cosa" })).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("lanza UnauthorizedError si el email no existe, comparando igual contra un hash", async () => {
      const compare = jest.spyOn(bcrypt, "compare");

      await expect(service.login({ email: "nadie@example.com", password: PASSWORD })).rejects.toThrow(
        UnauthorizedError,
      );
      expect(compare).toHaveBeenCalledTimes(1);
    });

    it("responde el mismo mensaje y status para email inexistente y contraseña incorrecta", async () => {
      const errorEmail = await service.login({ email: "nadie@example.com", password: PASSWORD }).catch((e) => e);
      usuarioRepository.findByEmail.mockResolvedValue(usuarioGuardado());
      const errorPassword = await service.login({ email: "ana@example.com", password: "otra-cosa" }).catch((e) => e);

      expect(errorEmail.message).toBe("Email o contraseña incorrectos");
      expect(errorEmail.message).toBe(errorPassword.message);
      expect(errorEmail.statusCode).toBe(401);
      expect(errorPassword.statusCode).toBe(401);
    });

    it("no emite token si las credenciales son inválidas", async () => {
      const sign = jest.spyOn(jwt, "sign");

      await service.login({ email: "nadie@example.com", password: PASSWORD }).catch(() => {});

      expect(sign).not.toHaveBeenCalled();
    });
  });
});
