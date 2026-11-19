import { ETIQUETAS_DE_ESTADO, textoDiasRestantes, textoEntradas } from "./compras";

describe("textoDiasRestantes", () => {
  it("habla en singular, hoy y plural", () => {
    expect(textoDiasRestantes(0)).toBe("El evento es hoy");
    expect(textoDiasRestantes(1)).toBe("Falta 1 día");
    expect(textoDiasRestantes(12)).toBe("Faltan 12 días");
  });

  it("no muestra nada si la compra no está confirmada (null)", () => {
    expect(textoDiasRestantes(null)).toBeNull();
  });
});

describe("textoEntradas y estados", () => {
  it("concuerda en singular y plural", () => {
    expect(textoEntradas(1)).toBe("1 entrada");
    expect(textoEntradas(3)).toBe("3 entradas");
  });

  it("tiene una etiqueta para cada estado del backend", () => {
    expect(Object.keys(ETIQUETAS_DE_ESTADO)).toEqual(["PENDIENTE", "CONFIRMADA", "UTILIZADA", "CANCELADA", "REEMBOLSADA"]);
  });
});
