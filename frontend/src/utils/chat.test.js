import { esMensajePropio, LARGO_MAXIMO_DE_MENSAJE, textoEnviable } from "./chat";

describe("textoEnviable", () => {
  it("recorta los espacios de los bordes", () => {
    expect(textoEnviable("  Hola, ¿a qué hora abren?  ")).toBe("Hola, ¿a qué hora abren?");
  });

  it("vacío o solo espacios no se manda", () => {
    expect(textoEnviable("")).toBeNull();
    expect(textoEnviable("   \n ")).toBeNull();
  });

  it("acepta justo el tope y rechaza uno más", () => {
    expect(textoEnviable("a".repeat(LARGO_MAXIMO_DE_MENSAJE))).toHaveLength(LARGO_MAXIMO_DE_MENSAJE);
    expect(textoEnviable("a".repeat(LARGO_MAXIMO_DE_MENSAJE + 1))).toBeNull();
  });
});

describe("esMensajePropio", () => {
  it("compara por el id del autor", () => {
    const mensaje = { autor: { id: "carla", rol: "COMPRADOR" } };
    expect(esMensajePropio(mensaje, "carla")).toBe(true);
    expect(esMensajePropio(mensaje, "olivia")).toBe(false);
  });
});
