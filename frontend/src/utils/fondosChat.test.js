import { colorDelFondo, FONDO_POR_DEFECTO, fondoDesdeGuardado, fondoParaGuardar, PALETA_DE_FONDOS } from "./fondosChat";

describe("fondo del chat guardado en el celular", () => {
  it("lo que se guarda se lee igual", () => {
    const vino = { tipo: "color", id: "vino" };

    expect(fondoDesdeGuardado(fondoParaGuardar(vino))).toEqual(vino);
  });

  it("sin nada guardado (primera vez), el fondo por defecto", () => {
    expect(fondoDesdeGuardado(null)).toEqual(FONDO_POR_DEFECTO);
  });

  it("si lo guardado está roto, el fondo por defecto en lugar de un error", () => {
    expect(fondoDesdeGuardado("{no es json")).toEqual(FONDO_POR_DEFECTO);
  });

  it("un color que ya no está en la paleta, o un tipo desconocido, vuelve al fondo por defecto", () => {
    expect(fondoDesdeGuardado(JSON.stringify({ tipo: "color", id: "fucsia" }))).toEqual(FONDO_POR_DEFECTO);
    expect(fondoDesdeGuardado(JSON.stringify({ tipo: "video", id: "vino" }))).toEqual(FONDO_POR_DEFECTO);
  });

  it("descarta campos de más que no son del fondo", () => {
    expect(fondoDesdeGuardado(JSON.stringify({ tipo: "color", id: "bosque", extra: 1 }))).toEqual({
      tipo: "color",
      id: "bosque",
    });
  });
});

describe("colorDelFondo", () => {
  it("devuelve el color de la paleta para el id elegido", () => {
    expect(colorDelFondo({ tipo: "color", id: "oceano" })).toBe("#0E1C2B");
  });

  it("el fondo por defecto es el color de fondo de la app", () => {
    expect(colorDelFondo(FONDO_POR_DEFECTO)).toBe("#14110F");
  });

  it("los ids de la paleta no se repiten", () => {
    const ids = PALETA_DE_FONDOS.map((opcion) => opcion.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
