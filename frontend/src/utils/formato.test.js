import { formatearEstrellas, formatearFecha, formatearFechaCorta, formatearPrecio } from "./formato";

describe("formatearEstrellas y formatearFechaCorta", () => {
  it("completa las estrellas hasta 5", () => {
    expect(formatearEstrellas(4)).toBe("★★★★☆");
    expect(formatearEstrellas(5)).toBe("★★★★★");
  });

  it("muestra la fecha sin hora", () => {
    expect(formatearFechaCorta(new Date(2026, 9, 26, 15, 0).toISOString())).toBe("26 oct 2026");
  });
});

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
