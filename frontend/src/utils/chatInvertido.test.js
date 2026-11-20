import { elementosDelChat, estaCercaDelFinal } from "./chat";

const ahora = new Date(2026, 10, 19, 21, 0);
const mensaje = (texto, fecha) => ({ autor: { id: "u1" }, mensaje: texto, enviado: fecha.toISOString() });

describe("elementosDelChat (lista invertida, como WhatsApp)", () => {
  const ayer = mensaje("hola", new Date(2026, 10, 18, 10, 0));
  const hoy1 = mensaje("¿abren a las 20?", new Date(2026, 10, 19, 9, 0));
  const hoy2 = mensaje("sí", new Date(2026, 10, 19, 9, 5));

  it("pone primero el mensaje más nuevo, que la lista invertida dibuja abajo de todo", () => {
    const elementos = elementosDelChat([ayer, hoy1, hoy2], ahora);
    expect(elementos[0]).toMatchObject({ tipo: "mensaje", mensaje: hoy2 });
  });

  it("deja cada separador de día después de sus mensajes, así se ve arriba de ellos", () => {
    const elementos = elementosDelChat([ayer, hoy1, hoy2], ahora);
    expect(elementos.map((e) => (e.tipo === "dia" ? e.etiqueta : e.mensaje.mensaje))).toEqual([
      "sí",
      "¿abren a las 20?",
      "Hoy",
      "hola",
      "Ayer",
    ]);
  });

  it("sin mensajes devuelve una lista vacía", () => {
    expect(elementosDelChat([], ahora)).toEqual([]);
  });
});

describe("estaCercaDelFinal", () => {
  it("en la lista invertida, el final es el desplazamiento 0", () => {
    expect(estaCercaDelFinal(0, 80)).toBe(true);
    expect(estaCercaDelFinal(79, 80)).toBe(true);
  });

  it("si se subió a leer mensajes viejos, ya no está en el final", () => {
    expect(estaCercaDelFinal(80, 80)).toBe(false);
    expect(estaCercaDelFinal(500, 80)).toBe(false);
  });
});
