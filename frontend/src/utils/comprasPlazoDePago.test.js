import { textoPlazoDePago, textoPlazoDePagoCorto, textoQuien } from "./compras";
import { formatearFechaEnFrase } from "./formato";

// Martes 24/11/2026 a las 21:30, en la hora local de quien corre los tests (igual que el formateador).
const LIMITE = new Date(2026, 10, 24, 21, 30).toISOString();
const pendiente = { estado: "PENDIENTE", fechaLimiteDePago: LIMITE };
const confirmada = { estado: "CONFIRMADA", fechaLimiteDePago: null };

describe("formatearFechaEnFrase", () => {
  it("arma la fecha para usar dentro de una frase", () => {
    expect(formatearFechaEnFrase(LIMITE)).toBe("mar 24 nov a las 21:30");
    expect(formatearFechaEnFrase(new Date(2026, 11, 5, 9, 5).toISOString())).toBe("sáb 5 dic a las 09:05");
  });
});

describe("textoPlazoDePago", () => {
  it("al comprador le dice hasta cuándo puede pagar y qué pasa si no", () => {
    expect(textoPlazoDePago(pendiente, true)).toBe(
      "Tenés hasta el mar 24 nov a las 21:30 para pagar. Si no, la compra se cancela sola y las entradas vuelven a la venta.",
    );
  });

  it("al organizador le habla del comprador", () => {
    expect(textoPlazoDePago(pendiente, false)).toBe(
      "El comprador tiene hasta el mar 24 nov a las 21:30 para pagar. Si no, la compra se cancela sola.",
    );
  });

  it("sin fecha límite (no está pendiente) no muestra nada", () => {
    expect(textoPlazoDePago(confirmada, true)).toBeNull();
    expect(textoPlazoDePagoCorto(confirmada)).toBeNull();
  });

  it("la versión corta es para la tarjeta", () => {
    expect(textoPlazoDePagoCorto(pendiente)).toBe("Pagá hasta el mar 24 nov a las 21:30");
  });
});

describe("textoQuien", () => {
  it("una persona: nombre y apellido", () => {
    expect(textoQuien({ id: "u1", nombre: "Camilo", apellido: "Sosa" })).toBe("Camilo Sosa");
  });

  it("el sistema: explica que venció el plazo, sin espacio de más", () => {
    expect(textoQuien({ id: "sistema", nombre: "AI Ticket It", apellido: "" })).toBe(
      "AI Ticket It (venció el plazo de pago)",
    );
  });
});
