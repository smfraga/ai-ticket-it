import { colorDelFondo, FONDO_POR_DEFECTO, fondoDesdeGuardado, fondoParaGuardar, imagenQueSobra } from "./fondosChat";

const IMAGEN = { tipo: "imagen", uri: "file:///app/documentos/fondo-chat-1.jpg" };
const OTRA_IMAGEN = { tipo: "imagen", uri: "file:///app/documentos/fondo-chat-2.jpg" };
const VINO = { tipo: "color", id: "vino" };

describe("fondo del chat con imagen", () => {
  it("una imagen guardada se lee igual", () => {
    expect(fondoDesdeGuardado(fondoParaGuardar(IMAGEN))).toEqual(IMAGEN);
  });

  it("solo acepta una copia local (file://): un enlace de la galería o de internet vuelve al fondo por defecto", () => {
    expect(fondoDesdeGuardado(JSON.stringify({ tipo: "imagen", uri: "ph://galeria/123" }))).toEqual(FONDO_POR_DEFECTO);
    expect(fondoDesdeGuardado(JSON.stringify({ tipo: "imagen", uri: "https://ejemplo.com/a.jpg" }))).toEqual(
      FONDO_POR_DEFECTO,
    );
    expect(fondoDesdeGuardado(JSON.stringify({ tipo: "imagen" }))).toEqual(FONDO_POR_DEFECTO);
  });

  it("detrás de una imagen queda el color de fondo de la app", () => {
    expect(colorDelFondo(IMAGEN)).toBe("#14110F");
  });
});

describe("imagenQueSobra (qué archivo borrar al cambiar de fondo)", () => {
  it("al pasar de una imagen a un color o a otra imagen, sobra la anterior", () => {
    expect(imagenQueSobra(IMAGEN, VINO)).toBe(IMAGEN.uri);
    expect(imagenQueSobra(IMAGEN, OTRA_IMAGEN)).toBe(IMAGEN.uri);
  });

  it("si la imagen no cambia, o antes había un color, no sobra nada", () => {
    expect(imagenQueSobra(IMAGEN, { ...IMAGEN })).toBeNull();
    expect(imagenQueSobra(VINO, IMAGEN)).toBeNull();
    expect(imagenQueSobra(VINO, FONDO_POR_DEFECTO)).toBeNull();
  });
});
