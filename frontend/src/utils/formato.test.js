import { formatearFecha, formatearPrecio } from "./formato";

describe("formatearPrecio", () => {
  it("separa los miles con punto", () => {
    expect(formatearPrecio(1500)).toBe("$1.500");
    expect(formatearPrecio(1250000)).toBe("$1.250.000");
    expect(formatearPrecio(800)).toBe("$800");
  });

  it("el precio cero se muestra como Gratis", () => {
    expect(formatearPrecio(0)).toBe("Gratis");
  });
});

describe("formatearFecha", () => {
  it("muestra día, fecha y hora con dos dígitos", () => {
    const iso = new Date(2026, 11, 5, 9, 5).toISOString(); // sábado 5 de diciembre de 2026
    expect(formatearFecha(iso)).toBe("sáb 5 dic · 09:05");
  });
});
