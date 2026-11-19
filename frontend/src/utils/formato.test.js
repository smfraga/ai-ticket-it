import { formatearEstrellas, formatearFecha, formatearFechaCorta, formatearPrecio, partesDeFecha } from "./formato";

describe("partesDeFecha (talón de la entrada)", () => {
  it("separa día de la semana, día, mes y hora, en mayúsculas y con la hora en dos dígitos", () => {
    const iso = new Date(2026, 11, 5, 9, 5).toISOString(); // sábado 5 de diciembre de 2026
    expect(partesDeFecha(iso)).toEqual({ diaSemana: "SÁB", dia: "5", mes: "DIC", hora: "09:05" });
  });

  it("conserva la tilde del miércoles en mayúsculas", () => {
    expect(partesDeFecha(new Date(2026, 11, 2, 21, 30).toISOString()).diaSemana).toBe("MIÉ");
  });

  it("a la medianoche del 1 de enero muestra el año nuevo y 00:00", () => {
    // viernes 1 de enero de 2027
    expect(partesDeFecha(new Date(2027, 0, 1, 0, 0).toISOString())).toEqual({
      diaSemana: "VIE",
      dia: "1",
      mes: "ENE",
      hora: "00:00",
    });
  });

  it("un minuto antes sigue siendo el 31 de diciembre", () => {
    expect(partesDeFecha(new Date(2026, 11, 31, 23, 59).toISOString())).toEqual({
      diaSemana: "JUE",
      dia: "31",
      mes: "DIC",
      hora: "23:59",
    });
  });
});

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
