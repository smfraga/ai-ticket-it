import {
  errorDeResenia,
  ETIQUETAS_DE_ESTADO,
  motivoSinCancelacion,
  puedeReseniar,
  puedeCancelar,
  textoDeConfirmacionDeCancelacion,
  textoDiasRestantes,
  textoEntradas,
} from "./compras";

const compra = (estado, yaPaso = false) => ({ estado, evento: { yaPaso } });

describe("puedeReseniar y errorDeResenia", () => {
  it("se reseña solo una compra UTILIZADA sin reseña", () => {
    expect(puedeReseniar({ estado: "UTILIZADA", resenia: null })).toBe(true);
    expect(puedeReseniar({ estado: "UTILIZADA", resenia: { id: "r1" } })).toBe(false);
    expect(puedeReseniar({ estado: "CONFIRMADA", resenia: null })).toBe(false);
  });

  it("exige una puntuación entera de 1 a 5", () => {
    expect(errorDeResenia({ puntuacion: 0, detalle: "Bien" })).toMatch(/puntuación/);
    expect(errorDeResenia({ puntuacion: 6, detalle: "Bien" })).toMatch(/puntuación/);
    expect(errorDeResenia({ puntuacion: null, detalle: "Bien" })).toMatch(/puntuación/);
  });

  it("exige un comentario que no sea solo espacios", () => {
    expect(errorDeResenia({ puntuacion: 4, detalle: "   " })).toMatch(/comentario/);
    expect(errorDeResenia({ puntuacion: 4, detalle: "Muy buen show" })).toBeNull();
  });
});

describe("puedeCancelar y motivoSinCancelacion", () => {
  it("se puede cancelar una PENDIENTE o CONFIRMADA de un evento que no pasó", () => {
    expect(puedeCancelar(compra("PENDIENTE"))).toBe(true);
    expect(puedeCancelar(compra("CONFIRMADA"))).toBe(true);
    expect(motivoSinCancelacion(compra("CONFIRMADA"))).toBeNull();
  });

  it("no se puede si está UTILIZADA, y lo explica", () => {
    expect(puedeCancelar(compra("UTILIZADA"))).toBe(false);
    expect(motivoSinCancelacion(compra("UTILIZADA"))).toBe("Esta compra ya fue utilizada: no se puede cancelar.");
  });

  it("no se puede si el evento ya pasó, y lo explica", () => {
    expect(puedeCancelar(compra("CONFIRMADA", true))).toBe(false);
    expect(motivoSinCancelacion(compra("CONFIRMADA", true))).toBe("El evento ya se realizó: no se puede cancelar.");
  });

  it("una compra ya cancelada o reembolsada no se cancela y no hace falta un motivo extra", () => {
    for (const estado of ["CANCELADA", "REEMBOLSADA"]) {
      expect(puedeCancelar(compra(estado))).toBe(false);
      expect(motivoSinCancelacion(compra(estado))).toBeNull();
    }
  });

  it("el aviso de confirmación menciona el reembolso solo si estaba CONFIRMADA", () => {
    expect(textoDeConfirmacionDeCancelacion(compra("CONFIRMADA"), "$24.000")).toContain("reembolsa $24.000");
    expect(textoDeConfirmacionDeCancelacion(compra("PENDIENTE"), "$24.000")).not.toContain("reembolsa");
  });
});

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
