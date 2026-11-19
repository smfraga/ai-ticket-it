import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import router, { montajes } from "../../routes/router.js";

// Todas las rutas del router, como "get /eventos/{id}", con si exigen token (llevan el middleware `autenticar`).
function rutasDelRouter() {
  const rutas = new Map();
  const agregar = (prefijo, route) => {
    const path = `${prefijo}${route.path}`.replace(/\/$/, "").replace(/:(\w+)/g, "{$1}") || "/";
    for (const [metodo, activo] of Object.entries(route.methods)) {
      if (!activo || metodo === "_all") continue;
      // Por método: en "/eventos", el GET es público y el POST lleva `autenticar`.
      const conToken = route.stack.some((capa) => capa.method === metodo && capa.name === "autenticar");
      rutas.set(`${metodo} ${path}`, conToken);
    }
  };
  router.stack.filter((capa) => capa.route).forEach((capa) => agregar("", capa.route));
  for (const [prefijo, subrouter] of Object.entries(montajes)) {
    subrouter.stack.filter((capa) => capa.route).forEach((capa) => agregar(prefijo, capa.route));
  }
  return rutas;
}

const METODOS = ["get", "post", "put", "patch", "delete"];

describe("Documentación de la API (Swagger)", () => {
  let spec;
  let documentadas;

  beforeAll(async () => {
    const respuesta = await request(app).get("/api-docs.json");
    expect(respuesta.status).toBe(200);
    spec = respuesta.body;
    documentadas = new Map();
    for (const [path, operaciones] of Object.entries(spec.paths)) {
      for (const metodo of METODOS.filter((m) => operaciones[m])) {
        documentadas.set(`${metodo} ${path}`, operaciones[metodo]);
      }
    }
  });

  it("/api-docs.json devuelve una especificación OpenAPI 3 con título", () => {
    expect(spec.openapi).toBe("3.0.3");
    expect(spec.info.title).toBe("AI Ticket It — API");
  });

  it("el router tiene las rutas esperadas (si esto falla, el test no está leyendo bien las rutas)", () => {
    const rutas = rutasDelRouter();
    expect(rutas.size).toBe(24);
    expect(rutas.get("get /eventos")).toBe(false);
    expect(rutas.get("post /eventos")).toBe(true);
    expect(rutas.get("patch /eventos/{id}")).toBe(true);
    expect(rutas.get("get /health")).toBe(false);
  });

  it("cada ruta del router está documentada", () => {
    const faltan = [...rutasDelRouter().keys()].filter((ruta) => !documentadas.has(ruta));
    expect(faltan).toEqual([]);
  });

  it("no hay rutas documentadas que no existan en el router", () => {
    const rutas = rutasDelRouter();
    const sobran = [...documentadas.keys()].filter((ruta) => !rutas.has(ruta));
    expect(sobran).toEqual([]);
  });

  it("piden token (candado y 401) exactamente las rutas que usan `autenticar`", () => {
    const distintas = [...rutasDelRouter()]
      .filter(([ruta, conToken]) => {
        const operacion = documentadas.get(ruta);
        const documentadaConToken = Boolean(operacion?.security?.some((s) => "bearerAuth" in s));
        return documentadaConToken !== conToken || (conToken && !operacion.responses["401"]);
      })
      .map(([ruta]) => ruta);
    expect(distintas).toEqual([]);
  });

  it("cada $ref apunta a algo que existe en `components`", () => {
    const refs = [];
    const recorrer = (nodo) => {
      if (Array.isArray(nodo)) return nodo.forEach(recorrer);
      if (nodo && typeof nodo === "object") {
        if (typeof nodo.$ref === "string") refs.push(nodo.$ref);
        Object.values(nodo).forEach(recorrer);
      }
    };
    recorrer(spec);

    const rotos = refs.filter((r) => {
      const [, , tipo, nombre] = r.split("/");
      return !spec.components[tipo]?.[nombre];
    });
    expect(refs.length).toBeGreaterThan(0);
    expect([...new Set(rotos)]).toEqual([]);
  });

  it("/api-docs sirve la interfaz de Swagger", async () => {
    const respuesta = await request(app).get("/api-docs/");

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers["content-type"]).toMatch(/html/);
    expect(respuesta.text).toContain("swagger-ui");
  });
});
