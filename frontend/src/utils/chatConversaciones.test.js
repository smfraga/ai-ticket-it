import { insigniaDeNoLeidos, lineaDeLaConversacion, vistaPreviaDelMensaje } from "./chat";

const conversacion = (ultimoMensaje) => ({
  contraparte: { nombre: "Olivia", apellido: "Rossi", rol: "ORGANIZADOR" },
  tipoEntrada: { nombre: "General" },
  cantidad: 2,
  ultimoMensaje,
});

describe("insigniaDeNoLeidos (número de la pestaña Mensajes)", () => {
  it("sin mensajes nuevos no muestra nada", () => {
    expect(insigniaDeNoLeidos(0)).toBeUndefined();
    expect(insigniaDeNoLeidos(undefined)).toBeUndefined();
  });

  it("muestra la cantidad hasta 99", () => {
    expect(insigniaDeNoLeidos(1)).toBe(1);
    expect(insigniaDeNoLeidos(99)).toBe(99);
  });

  it("desde 100 muestra 99+", () => {
    expect(insigniaDeNoLeidos(100)).toBe("99+");
  });
});

describe("textos de cada chat en la lista", () => {
  it("la línea dice con quién se habla, qué entrada y cuántas", () => {
    expect(lineaDeLaConversacion(conversacion({ texto: "Hola", propio: false }))).toBe("Olivia Rossi · General ×2");
  });

  it("la vista previa antepone 'Vos: ' solo a los mensajes propios", () => {
    expect(vistaPreviaDelMensaje(conversacion({ texto: "A las 20", propio: false }))).toBe("A las 20");
    expect(vistaPreviaDelMensaje(conversacion({ texto: "Gracias", propio: true }))).toBe("Vos: Gracias");
  });
});
