import { textoMensajesNuevos, tituloDelBotonDeChat } from "./compras";

describe("textoMensajesNuevos", () => {
  it("nada si no hay mensajes nuevos (o el dato no vino)", () => {
    expect(textoMensajesNuevos(0)).toBeNull();
    expect(textoMensajesNuevos(undefined)).toBeNull();
  });

  it("singular y plural", () => {
    expect(textoMensajesNuevos(1)).toBe("1 mensaje nuevo");
    expect(textoMensajesNuevos(3)).toBe("3 mensajes nuevos");
  });
});

describe("tituloDelBotonDeChat", () => {
  it("sin mensajes nuevos, el título de siempre", () => {
    expect(tituloDelBotonDeChat("Chat con el organizador", 0)).toBe("Chat con el organizador");
    expect(tituloDelBotonDeChat("Chat con el organizador", undefined)).toBe("Chat con el organizador");
  });

  it("con mensajes nuevos, la cantidad entre paréntesis", () => {
    expect(tituloDelBotonDeChat("Chat con el comprador", 1)).toBe("Chat con el comprador (1 nuevo)");
    expect(tituloDelBotonDeChat("Chat con el organizador", 2)).toBe("Chat con el organizador (2 nuevos)");
  });
});
