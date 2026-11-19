import { conSeparadores, etiquetaDeDia } from "./fechasChat";

// Jueves 19 de noviembre de 2026, 10:00 (hora local, como en el celular).
const AHORA = new Date(2026, 10, 19, 10, 0);
const iso = (...partes) => new Date(...partes).toISOString();
const mensaje = (texto, ...partes) => ({ autor: { id: "carla" }, mensaje: texto, enviado: iso(...partes) });

describe("etiquetaDeDia (separador dentro del chat)", () => {
  it("hoy y ayer, por día de calendario: anoche a las 23:59 ya es Ayer", () => {
    expect(etiquetaDeDia(iso(2026, 10, 19, 0, 1), AHORA)).toBe("Hoy");
    expect(etiquetaDeDia(iso(2026, 10, 18, 23, 59), AHORA)).toBe("Ayer");
  });

  it("de 2 a 6 días atrás, el día de la semana", () => {
    expect(etiquetaDeDia(iso(2026, 10, 17, 9, 0), AHORA)).toBe("Martes");
    expect(etiquetaDeDia(iso(2026, 10, 13, 9, 0), AHORA)).toBe("Viernes");
  });

  it("desde hace 7 días, el día y el mes, sin el año si es el actual", () => {
    expect(etiquetaDeDia(iso(2026, 10, 12, 9, 0), AHORA)).toBe("12 de noviembre");
    expect(etiquetaDeDia(iso(2026, 0, 1, 9, 0), AHORA)).toBe("1 de enero");
  });

  it("de otro año, con el año", () => {
    expect(etiquetaDeDia(iso(2025, 11, 31, 22, 0), AHORA)).toBe("31 de diciembre de 2025");
  });
});

describe("conSeparadores", () => {
  it("sin mensajes no hay separadores", () => {
    expect(conSeparadores([], AHORA)).toEqual([]);
  });

  it("pone un separador antes del primer mensaje de cada día, y no entre mensajes del mismo día", () => {
    const mensajes = [
      mensaje("Hola", 2026, 10, 13, 19, 0),
      mensaje("¿Abren a las 20?", 2026, 10, 13, 23, 0),
      mensaje("¿Puedo ir con mochila?", 2026, 10, 18, 17, 0),
      mensaje("Te esperamos", 2026, 10, 19, 9, 0),
    ];

    const elementos = conSeparadores(mensajes, AHORA);

    expect(elementos.map((e) => (e.tipo === "dia" ? `[${e.etiqueta}]` : e.mensaje.mensaje))).toEqual([
      "[Viernes]",
      "Hola",
      "¿Abren a las 20?",
      "[Ayer]",
      "¿Puedo ir con mochila?",
      "[Hoy]",
      "Te esperamos",
    ]);
  });

  it("cambia de día a la medianoche y no a las 24 horas del mensaje anterior", () => {
    const elementos = conSeparadores(
      [mensaje("Antes", 2026, 10, 18, 23, 59), mensaje("Después", 2026, 10, 19, 0, 1)],
      AHORA,
    );

    expect(elementos.filter((e) => e.tipo === "dia").map((e) => e.etiqueta)).toEqual(["Ayer", "Hoy"]);
  });

  it("cada separador tiene una clave distinta y cada mensaje conserva su posición original", () => {
    const elementos = conSeparadores(
      [mensaje("Uno", 2026, 10, 12, 9, 0), mensaje("Dos", 2026, 10, 12, 10, 0), mensaje("Tres", 2026, 10, 19, 9, 0)],
      AHORA,
    );

    expect(elementos.filter((e) => e.tipo === "dia").map((e) => e.clave)).toEqual(["dia-2026-11-12", "dia-2026-11-19"]);
    expect(elementos.filter((e) => e.tipo === "mensaje").map((e) => e.indice)).toEqual([0, 1, 2]);
  });
});
