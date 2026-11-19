import { separarPorPeriodo, textoCupo } from "./eventos";

describe("textoCupo", () => {
  it("dice cuántas quedan del total, en singular y plural", () => {
    expect(textoCupo({ cupo: 200, cupoRestante: 120 })).toBe("Quedan 120 de 200");
    expect(textoCupo({ cupo: 50, cupoRestante: 1 })).toBe("Queda 1 de 50");
  });

  it("avisa cuando el tipo está agotado", () => {
    expect(textoCupo({ cupo: 30, cupoRestante: 0 })).toBe("Agotado (30 de 30 vendidas)");
  });
});

describe("separarPorPeriodo", () => {
  it("separa próximos y pasados, con los pasados del más reciente al más viejo", () => {
    // Así llegan con periodo=todos: ordenados por fecha ascendente.
    const eventos = [
      { id: "viejo", yaPaso: true },
      { id: "reciente", yaPaso: true },
      { id: "cerca", yaPaso: false },
      { id: "lejos", yaPaso: false },
    ];

    const { proximos, pasados } = separarPorPeriodo(eventos);

    expect(proximos.map((e) => e.id)).toEqual(["cerca", "lejos"]);
    expect(pasados.map((e) => e.id)).toEqual(["reciente", "viejo"]);
  });

  it("no modifica la lista recibida", () => {
    const eventos = [{ id: "a", yaPaso: true }, { id: "b", yaPaso: true }];
    separarPorPeriodo(eventos);
    expect(eventos.map((e) => e.id)).toEqual(["a", "b"]);
  });
});
