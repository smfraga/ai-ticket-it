import { diasAtras, horaDelMensaje, horaEnLista } from "./fechasChat";

// Jueves 19 de noviembre de 2026, 10:00 (hora local, como en el celular).
const AHORA = new Date(2026, 10, 19, 10, 0);
const iso = (...partes) => new Date(...partes).toISOString();

describe("diasAtras", () => {
  it("cuenta días de calendario, no horas: anoche a las 23:50 ya es ayer", () => {
    expect(diasAtras(new Date(2026, 10, 19, 0, 5), AHORA)).toBe(0);
    expect(diasAtras(new Date(2026, 10, 18, 23, 50), AHORA)).toBe(1);
  });

  it("una fecha futura (reloj del servidor adelantado) cuenta como hoy", () => {
    expect(diasAtras(new Date(2026, 10, 20, 9, 0), AHORA)).toBe(0);
  });
});

describe("horaDelMensaje", () => {
  it("muestra horas y minutos con dos dígitos", () => {
    expect(horaDelMensaje(iso(2026, 10, 19, 9, 5))).toBe("09:05");
  });
});

describe("horaEnLista (último mensaje de cada chat)", () => {
  it("si es de hoy, la hora", () => {
    expect(horaEnLista(iso(2026, 10, 19, 8, 7), AHORA)).toBe("08:07");
  });

  it("si es de ayer, aunque falten minutos para medianoche, 'Ayer'", () => {
    expect(horaEnLista(iso(2026, 10, 18, 23, 59), AHORA)).toBe("Ayer");
    expect(horaEnLista(iso(2026, 10, 18, 0, 0), AHORA)).toBe("Ayer");
  });

  it("dentro de la última semana, el día de la semana", () => {
    expect(horaEnLista(iso(2026, 10, 17, 12, 0), AHORA)).toBe("Martes");
    expect(horaEnLista(iso(2026, 10, 13, 12, 0), AHORA)).toBe("Viernes"); // hace 6 días
  });

  it("desde hace 7 días, la fecha corta dd/mm/aa", () => {
    expect(horaEnLista(iso(2026, 10, 12, 12, 0), AHORA)).toBe("12/11/26");
  });

  it("un mensaje del año anterior muestra su año", () => {
    expect(horaEnLista(iso(2025, 11, 31, 22, 0), AHORA)).toBe("31/12/25");
  });
});
