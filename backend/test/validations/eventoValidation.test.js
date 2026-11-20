import { describe, expect, it } from "@jest/globals";
import {
  DIRECCIONES,
  ORDENES,
  PERIODOS,
  crearEventoValidation,
  filtrosEventosValidation,
} from "../../validations/eventoValidation.js";

const CATEGORIA_ID = "3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a13";

const eventoValido = {
  nombre: "Recital de rock",
  descripcion: "Una noche de rock nacional",
  categoriaId: CATEGORIA_ID,
  fecha: "2026-12-20T21:00:00Z",
  tiposEntrada: [
    { nombre: "General", descripcion: "Campo", precio: 15000, cupo: 100 },
    { nombre: "VIP", precio: 40000, cupo: 20 },
  ],
  multimedia: ["https://example.com/foto.jpg"],
};

describe("crearEventoValidation", () => {
  it("acepta un evento válido y convierte la fecha en Date", () => {
    const resultado = crearEventoValidation.parse(eventoValido);

    expect(resultado.fecha).toBeInstanceOf(Date);
    expect(resultado.fecha.toISOString()).toBe("2026-12-20T21:00:00.000Z");
    expect(resultado.tiposEntrada).toHaveLength(2);
  });

  it("acepta una fecha con zona horaria", () => {
    const resultado = crearEventoValidation.parse({ ...eventoValido, fecha: "2026-12-20T21:00:00-03:00" });

    expect(resultado.fecha.toISOString()).toBe("2026-12-21T00:00:00.000Z");
  });

  it("la descripción y la multimedia son opcionales, y la multimedia queda vacía por defecto", () => {
    const { descripcion, multimedia, ...minimo } = eventoValido;

    const resultado = crearEventoValidation.parse(minimo);

    expect(resultado.descripcion).toBeUndefined();
    expect(resultado.multimedia).toEqual([]);
  });

  it("recorta los textos", () => {
    const resultado = crearEventoValidation.parse({ ...eventoValido, nombre: "  Recital  " });

    expect(resultado.nombre).toBe("Recital");
  });

  it.each(["nombre", "categoriaId", "fecha", "tiposEntrada"])("rechaza un evento sin %s", (campo) => {
    const { [campo]: _omitido, ...incompleto } = eventoValido;

    expect(crearEventoValidation.safeParse(incompleto).success).toBe(false);
  });

  it.each([
    ["con nombre vacío", { nombre: "   " }],
    ["con categoriaId que no es UUID", { categoriaId: "123" }],
    ["con fecha sin hora", { fecha: "2026-12-20" }],
    ["con fecha que no es texto", { fecha: 1798000000000 }],
    ["con fecha inexistente", { fecha: "2026-13-45T25:00:00Z" }],
    ["sin tipos de entrada", { tiposEntrada: [] }],
    ["con tipos de entrada que no son lista", { tiposEntrada: { nombre: "General" } }],
    ["con multimedia que no es URL", { multimedia: ["foto.jpg"] }],
    ["con multimedia que no es lista", { multimedia: "https://example.com/foto.jpg" }],
    ["con un campo de más", { organizadorId: "otro" }],
  ])("rechaza un evento %s", (_, cambios) => {
    expect(crearEventoValidation.safeParse({ ...eventoValido, ...cambios }).success).toBe(false);
  });

  describe("tipos de entrada", () => {
    const conTipo = (tipo) => ({ ...eventoValido, tiposEntrada: [tipo] });
    const tipoValido = { nombre: "General", precio: 1000, cupo: 10 };

    it("acepta una entrada gratuita", () => {
      expect(crearEventoValidation.safeParse(conTipo({ ...tipoValido, precio: 0 })).success).toBe(true);
    });

    it.each([
      ["sin nombre", { nombre: "" }],
      ["con precio negativo", { precio: -1 }],
      ["con precio que es texto", { precio: "1000" }],
      ["sin precio", { precio: undefined }],
      ["con cupo 0", { cupo: 0 }],
      ["con cupo negativo", { cupo: -5 }],
      ["con cupo decimal", { cupo: 1.5 }],
      ["con cupo que es texto", { cupo: "10" }],
      ["con un campo de más", { vendidas: 5 }],
    ])("rechaza un tipo de entrada %s", (_, cambios) => {
      expect(crearEventoValidation.safeParse(conTipo({ ...tipoValido, ...cambios })).success).toBe(false);
    });
  });
});

describe("filtrosEventosValidation", () => {
  it("sin parámetros usa los valores por defecto", () => {
    expect(filtrosEventosValidation.parse({})).toEqual({ periodo: "proximos", orden: "fecha", page: 1, limit: 20 });
  });

  it("convierte los números de la query, que llegan como texto", () => {
    const resultado = filtrosEventosValidation.parse({ precioMin: "1000", precioMax: "25000.5" });

    expect(resultado.precioMin).toBe(1000);
    expect(resultado.precioMax).toBe(25000.5);
  });

  it("trata un precio vacío como no enviado, no como 0", () => {
    const resultado = filtrosEventosValidation.parse({ precioMin: "", precioMax: "" });

    expect(resultado.precioMin).toBeUndefined();
    expect(resultado.precioMax).toBeUndefined();
  });

  it("acepta todos los valores de periodo, orden y dirección", () => {
    PERIODOS.forEach((periodo) => expect(filtrosEventosValidation.safeParse({ periodo }).success).toBe(true));
    ORDENES.forEach((orden) => expect(filtrosEventosValidation.safeParse({ orden }).success).toBe(true));
    DIRECCIONES.forEach((direccion) => expect(filtrosEventosValidation.safeParse({ direccion }).success).toBe(true));
  });

  it("recorta el texto y lo deja sin definir si queda vacío", () => {
    expect(filtrosEventosValidation.parse({ texto: "  rock  " }).texto).toBe("rock");
    expect(filtrosEventosValidation.parse({ texto: "   " }).texto).toBeUndefined();
  });

  it("acepta el rango de precios con los dos extremos iguales", () => {
    expect(filtrosEventosValidation.safeParse({ precioMin: "500", precioMax: "500" }).success).toBe(true);
  });

  it("acepta el filtro por categoría", () => {
    expect(filtrosEventosValidation.parse({ categoriaId: CATEGORIA_ID }).categoriaId).toBe(CATEGORIA_ID);
  });

  it("acepta el filtro por organizador", () => {
    expect(filtrosEventosValidation.parse({ organizadorId: CATEGORIA_ID }).organizadorId).toBe(CATEGORIA_ID);
    expect(filtrosEventosValidation.parse({}).organizadorId).toBeUndefined();
  });

  it.each([
    ["precioMin negativo", { precioMin: "-1" }],
    ["precioMax que no es número", { precioMax: "barato" }],
    ["categoriaId que no es UUID", { categoriaId: "123" }],
    ["organizadorId que no es UUID", { organizadorId: "olivia" }],
    ["periodo desconocido", { periodo: "futuros" }],
    ["orden desconocido", { orden: "nombre" }],
    ["dirección desconocida", { direccion: "arriba" }],
    ["texto de más de 100 caracteres", { texto: "a".repeat(101) }],
    ["un parámetro que no existe", { pais: "AR" }],
    ["page 0", { page: "0" }],
    ["limit 0", { limit: "0" }],
    ["limit de más de 100", { limit: "101" }],
    ["limit con decimales", { limit: "10.5" }],
    ["page que no es número", { page: "dos" }],
    ["los nombres en castellano (pagina y limite)", { pagina: "2", limite: "10" }],
  ])("rechaza %s", (_, query) => {
    expect(filtrosEventosValidation.safeParse(query).success).toBe(false);
  });

  it("acepta la paginación y la convierte a números; por defecto, la página 1 de a 20", () => {
    expect(filtrosEventosValidation.parse({ page: "3", limit: "10" })).toMatchObject({ page: 3, limit: 10 });
    expect(filtrosEventosValidation.parse({ limit: "100" })).toMatchObject({ page: 1, limit: 100 });
    expect(filtrosEventosValidation.parse({ page: "2" })).toMatchObject({ page: 2, limit: 20 });
  });

  it("rechaza un rango invertido y marca precioMax como el campo con error", () => {
    const resultado = filtrosEventosValidation.safeParse({ precioMin: "20000", precioMax: "10000" });

    expect(resultado.success).toBe(false);
    expect(resultado.error.issues[0]).toMatchObject({
      path: ["precioMax"],
      message: "precioMin no puede ser mayor que precioMax",
    });
  });
});
