import { puedeCancelar, puedePagar, textoDeConfirmacionDeCancelacionDeEvento } from "./compras";

const compra = (estado, evento = {}) => ({ estado, evento: { yaPaso: false, cancelado: false, ...evento } });

describe("compras de un evento cancelado", () => {
  it("no se pueden cancelar ni pagar aunque el estado lo permitiera", () => {
    expect(puedeCancelar(compra("CONFIRMADA"))).toBe(true);
    expect(puedeCancelar(compra("CONFIRMADA", { cancelado: true }))).toBe(false);
    expect(puedePagar(compra("PENDIENTE"))).toBe(true);
    expect(puedePagar(compra("PENDIENTE", { cancelado: true }))).toBe(false);
  });
});

describe("textoDeConfirmacionDeCancelacionDeEvento", () => {
  const compras = (...estados) => estados.map((estado) => compra(estado));

  it("cuenta las confirmadas que se reembolsan y las pendientes que se cancelan", () => {
    expect(
      textoDeConfirmacionDeCancelacionDeEvento(compras("CONFIRMADA", "CONFIRMADA", "PENDIENTE", "CANCELADA")),
    ).toBe(
      "El evento sale del catálogo: se reembolsan 2 compras confirmadas, se cancela 1 compra pendiente " +
        "y cada comprador recibe un aviso en el chat. No se puede deshacer.",
    );
  });

  it("usa el singular y omite lo que no hay", () => {
    expect(textoDeConfirmacionDeCancelacionDeEvento(compras("CONFIRMADA"))).toBe(
      "El evento sale del catálogo: se reembolsa 1 compra confirmada y cada comprador recibe un aviso en el chat. " +
        "No se puede deshacer.",
    );
  });

  it("sin compras activas lo dice", () => {
    const texto = "El evento sale del catálogo. No tiene compras activas. No se puede deshacer.";
    expect(textoDeConfirmacionDeCancelacionDeEvento(compras("REEMBOLSADA", "UTILIZADA"))).toBe(texto);
    expect(textoDeConfirmacionDeCancelacionDeEvento([])).toBe(texto);
  });
});
