import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

// Va en un archivo aparte: el contador es por IP y todos los pedidos de supertest comparten IP,
// así los logins fallidos de esta prueba no afectan a los de otros archivos.
describe("Límite de intentos de login (API completa)", () => {
  const credenciales = { email: "limite@example.com", password: "una-contraseña-larga" };

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    await request(app)
      .post("/auth/registro")
      .send({ nombre: "Ana", apellido: "Pérez", roles: ["COMPRADOR"], ...credenciales });
  });

  it("después de 10 logins fallidos responde 429 con Retry-After, aunque la contraseña sea correcta", async () => {
    for (let i = 0; i < 10; i++) {
      const respuesta = await request(app)
        .post("/auth/login")
        .send({ ...credenciales, password: "contraseña-equivocada" });
      expect(respuesta.status).toBe(401);
    }

    const bloqueada = await request(app).post("/auth/login").send(credenciales);

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.headers["retry-after"]).toBeDefined();
    expect(bloqueada.body).toMatchObject({ status: "fail" });
    expect(bloqueada.body).not.toHaveProperty("token");
  });

  it("el registro no tiene límite de intentos", async () => {
    const respuesta = await request(app)
      .post("/auth/registro")
      .send({
        nombre: "Luz",
        apellido: "Gómez",
        roles: ["COMPRADOR"],
        email: "luz@example.com",
        password: "una-contraseña-larga",
      });

    expect(respuesta.status).toBe(201);
  });
});
