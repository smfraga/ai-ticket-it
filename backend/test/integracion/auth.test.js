import { beforeAll, describe, expect, it } from "@jest/globals";
import express from "express";
import request from "supertest";
import { app } from "../../app.js";
import { autenticar } from "../../middlewares/autenticar.js";
import { errorHandler } from "../../middlewares/errorHandler.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

const registroValido = {
  nombre: "Ana",
  apellido: "Pérez",
  email: "ana@example.com",
  password: "una-contraseña-larga",
  roles: ["COMPRADOR"],
};

describe("Autenticación (API completa)", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
  });

  describe("POST /auth/registro", () => {
    it("crea el usuario y responde 201 con la sesión, sin contraseña ni hash", async () => {
      const respuesta = await request(app).post("/auth/registro").send(registroValido);

      expect(respuesta.status).toBe(201);
      expect(respuesta.body.token).toEqual(expect.any(String));
      expect(respuesta.body.usuario).toEqual({
        id: expect.any(String),
        nombre: "Ana",
        apellido: "Pérez",
        email: "ana@example.com",
        roles: ["COMPRADOR"],
      });
      expect(JSON.stringify(respuesta.body)).not.toContain(registroValido.password);
      expect(respuesta.body.usuario).not.toHaveProperty("passwordHash");
    });

    it("responde 409 si el email ya está registrado, aunque cambien las mayúsculas", async () => {
      await request(app)
        .post("/auth/registro")
        .send({ ...registroValido, email: "repetido@example.com" });

      const respuesta = await request(app)
        .post("/auth/registro")
        .send({ ...registroValido, email: "REPETIDO@example.com" });

      expect(respuesta.status).toBe(409);
      expect(respuesta.body).toMatchObject({
        status: "fail",
        message: "Ya existe un usuario con ese email",
      });
    });

    it.each([
      ["sin roles", { roles: [] }],
      ["con contraseña corta", { password: "corta" }],
      ["con email inválido", { email: "sin-arroba" }],
      ["con un campo de más", { esAdmin: true }],
    ])("responde 400 con el detalle si el cuerpo viene %s", async (_, cambios) => {
      const respuesta = await request(app)
        .post("/auth/registro")
        .send({ ...registroValido, email: "invalido@example.com", ...cambios });

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.status).toBe("fail");
      expect(respuesta.body.details).toEqual(expect.any(Array));
    });
  });

  describe("POST /auth/login", () => {
    beforeAll(async () => {
      await request(app)
        .post("/auth/registro")
        .send({ ...registroValido, email: "login@example.com" });
    });

    it("responde 200 con la sesión si las credenciales son correctas", async () => {
      const respuesta = await request(app)
        .post("/auth/login")
        .send({ email: "login@example.com", password: registroValido.password });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.token).toEqual(expect.any(String));
      expect(respuesta.body.usuario.email).toBe("login@example.com");
    });

    it("ignora mayúsculas y espacios en el email", async () => {
      const respuesta = await request(app)
        .post("/auth/login")
        .send({ email: "  LOGIN@Example.com ", password: registroValido.password });

      expect(respuesta.status).toBe(200);
    });

    it("responde 401 con el mismo mensaje para contraseña incorrecta y email inexistente", async () => {
      const passwordMala = await request(app)
        .post("/auth/login")
        .send({ email: "login@example.com", password: "otra-contraseña" });
      const emailInexistente = await request(app)
        .post("/auth/login")
        .send({ email: "nadie@example.com", password: registroValido.password });

      expect(passwordMala.status).toBe(401);
      expect(emailInexistente.status).toBe(401);
      expect(passwordMala.body.message).toBe("Email o contraseña incorrectos");
      expect(emailInexistente.body.message).toBe(passwordMala.body.message);
      expect(passwordMala.body).not.toHaveProperty("token");
    });

    it("responde 400 si falta la contraseña", async () => {
      const respuesta = await request(app).post("/auth/login").send({ email: "login@example.com" });

      expect(respuesta.status).toBe(400);
    });
  });

  describe("errores generales de la API", () => {
    it("responde 404 en JSON si la ruta no existe", async () => {
      const respuesta = await request(app).get("/no-existe");

      expect(respuesta.status).toBe(404);
      expect(respuesta.body).toMatchObject({
        status: "fail",
        message: "Ruta /no-existe no encontrada",
      });
    });

    it("responde 400 en JSON si el cuerpo no es un JSON válido", async () => {
      const respuesta = await request(app)
        .post("/auth/login")
        .set("Content-Type", "application/json")
        .send("{esto no es json");

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.message).toBe("El cuerpo de la request no es un JSON válido");
    });

    it("el health check sigue respondiendo", async () => {
      const respuesta = await request(app).get("/health");

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ status: "ok" });
    });
  });

  describe("una ruta protegida con autenticar", () => {
    // Todavía no hay rutas protegidas reales: se arma una mínima para probar el flujo completo.
    const rutaProtegida = express();
    rutaProtegida.get("/privado", autenticar, (req, res) => res.json({ usuario: req.usuario }));
    rutaProtegida.use(errorHandler);

    it("responde 401 sin token", async () => {
      const respuesta = await request(rutaProtegida).get("/privado");

      expect(respuesta.status).toBe(401);
      expect(respuesta.body.message).toBe("Falta el token de sesión");
    });

    it("responde 401 con un token inválido", async () => {
      const respuesta = await request(rutaProtegida).get("/privado").set("Authorization", "Bearer falso");

      expect(respuesta.status).toBe(401);
      expect(respuesta.body.message).toBe("Token inválido");
    });

    it("acepta el token que devolvió el login y deja id y roles del usuario", async () => {
      const sesion = await request(app)
        .post("/auth/registro")
        .send({ ...registroValido, email: "privado@example.com", roles: ["ORGANIZADOR"] });

      const respuesta = await request(rutaProtegida)
        .get("/privado")
        .set("Authorization", `Bearer ${sesion.body.token}`);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.usuario).toEqual({ id: sesion.body.usuario.id, roles: ["ORGANIZADOR"] });
    });
  });
});
