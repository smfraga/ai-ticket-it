import { afterEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";

describe("Cabeceras de seguridad", () => {
  const origenesAntes = process.env.CORS_ORIGINS;
  afterEach(() => {
    if (origenesAntes === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = origenesAntes;
  });

  it("no anuncia que el servidor es Express (sin X-Powered-By)", async () => {
    const respuesta = await request(app).get("/health");

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers["x-powered-by"]).toBeUndefined();
  });

  it("tampoco en un error (404)", async () => {
    expect((await request(app).get("/no-existe")).headers["x-powered-by"]).toBeUndefined();
  });

  describe("CORS", () => {
    it("sin CORS_ORIGINS, un navegador de otro origen no recibe permiso", async () => {
      delete process.env.CORS_ORIGINS;

      const respuesta = await request(app).get("/categorias").set("Origin", "https://otro-sitio.example");

      expect(respuesta.status).toBe(200); // el servidor responde igual: el que bloquea es el navegador
      expect(respuesta.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("un origen de la lista recibe permiso para ese origen exacto, y otro no", async () => {
      process.env.CORS_ORIGINS = "http://localhost:8081, https://ticket.example";

      const permitido = await request(app).get("/categorias").set("Origin", "https://ticket.example");
      const otroPuerto = await request(app).get("/categorias").set("Origin", "http://localhost:8082");

      expect(permitido.headers["access-control-allow-origin"]).toBe("https://ticket.example");
      expect(otroPuerto.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("el preflight (OPTIONS) de un origen permitido autoriza el token", async () => {
      process.env.CORS_ORIGINS = "http://localhost:8081";

      const respuesta = await request(app)
        .options("/compras")
        .set("Origin", "http://localhost:8081")
        .set("Access-Control-Request-Method", "GET")
        .set("Access-Control-Request-Headers", "authorization");

      expect(respuesta.status).toBe(204);
      expect(respuesta.headers["access-control-allow-origin"]).toBe("http://localhost:8081");
      expect(respuesta.headers["access-control-allow-headers"]).toMatch(/authorization/i);
    });

    it("la app del celular (sin cabecera Origin) funciona igual", async () => {
      delete process.env.CORS_ORIGINS;

      expect((await request(app).get("/categorias")).status).toBe(200);
    });
  });
});
