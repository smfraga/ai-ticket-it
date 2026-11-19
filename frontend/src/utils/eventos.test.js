import {
  armarEventoParaEnviar,
  conFavorito,
  errorDeEvento,
  fechaInicialDeEvento,
  leerCupo,
  leerPrecio,
  parametrosDePrecio,
  RANGOS_DE_PRECIO,
  separarPorPeriodo,
  textoCupo,
} from "./eventos";

const AHORA = new Date(2026, 10, 19, 12, 0);
const formulario = (cambios = {}) => ({
  nombre: "Recital de rock",
  descripcion: "",
  categoriaId: "cat-1",
  fecha: new Date(2026, 11, 20, 21, 0),
  tiposEntrada: [
    { nombre: "General", precio: "15000", cupo: "100" },
    { nombre: "VIP", precio: "40000,50", cupo: "20" },
  ],
  ...cambios,
});

describe("parametrosDePrecio", () => {
  it("traduce cada chip al rango que se manda al backend", () => {
    expect(parametrosDePrecio("cualquiera")).toEqual({ precioMin: undefined, precioMax: undefined });
    expect(parametrosDePrecio("hasta5000")).toEqual({ precioMin: undefined, precioMax: 5000 });
    expect(parametrosDePrecio("5000a10000")).toEqual({ precioMin: 5000, precioMax: 10000 });
    expect(parametrosDePrecio("masDe10000")).toEqual({ precioMin: 10000, precioMax: undefined });
  });

  it("un valor desconocido no filtra, y el primer rango es 'Cualquiera'", () => {
    expect(parametrosDePrecio("otro")).toEqual({ precioMin: undefined, precioMax: undefined });
    expect(RANGOS_DE_PRECIO[0].valor).toBe("cualquiera");
  });
});

describe("conFavorito", () => {
  it("agrega y quita devolviendo un Set nuevo, sin tocar el anterior", () => {
    const antes = new Set(["rock"]);

    const conJazz = conFavorito(antes, "jazz", true);
    const sinRock = conFavorito(antes, "rock", false);

    expect([...conJazz]).toEqual(["rock", "jazz"]);
    expect([...sinRock]).toEqual([]);
    expect([...antes]).toEqual(["rock"]);
    expect(conJazz).not.toBe(antes);
  });

  it("repetir la misma acción no cambia el contenido", () => {
    expect([...conFavorito(new Set(["rock"]), "rock", true)]).toEqual(["rock"]);
    expect([...conFavorito(new Set(), "rock", false)]).toEqual([]);
  });
});

describe("leerPrecio y leerCupo", () => {
  it("leen precios con coma o punto decimal y cupos enteros positivos", () => {
    expect(leerPrecio("15000")).toBe(15000);
    expect(leerPrecio(" 1500,5 ")).toBe(1500.5);
    expect(leerPrecio("0")).toBe(0);
    expect(leerCupo("120")).toBe(120);
  });

  it("rechazan lo que no es un número válido", () => {
    for (const texto of ["", "abc", "-5", "1,2,3", "10,999"]) expect(leerPrecio(texto)).toBeNull();
    for (const texto of ["", "0", "1.5", "-3", "diez"]) expect(leerCupo(texto)).toBeNull();
  });
});

describe("errorDeEvento", () => {
  it("un formulario completo se puede enviar", () => {
    expect(errorDeEvento(formulario(), AHORA)).toBeNull();
  });

  it.each([
    ["sin nombre", { nombre: "  " }, /nombre del evento/],
    ["sin categoría", { categoriaId: null }, /categoría/],
    ["con fecha pasada", { fecha: new Date(2026, 10, 18) }, /futura/],
    ["sin tipos de entrada", { tiposEntrada: [] }, /al menos un tipo/],
  ])("avisa %s", (_, cambios, mensaje) => {
    expect(errorDeEvento(formulario(cambios), AHORA)).toMatch(mensaje);
  });

  it("dice qué tipo de entrada tiene el problema", () => {
    const tipos = [
      { nombre: "General", precio: "15000", cupo: "100" },
      { nombre: "VIP", precio: "40000", cupo: "0" },
    ];
    expect(errorDeEvento(formulario({ tiposEntrada: tipos }), AHORA)).toBe(
      "Tipo de entrada 2: el cupo tiene que ser un número entero mayor a 0.",
    );
  });

  it("la imagen es opcional, pero si se escribe tiene que ser una URL http(s)", () => {
    expect(errorDeEvento(formulario({ imagen: "" }), AHORA)).toBeNull();
    expect(errorDeEvento(formulario({ imagen: " https://example.com/foto.jpg " }), AHORA)).toBeNull();
    for (const imagen of ["foto.jpg", "ftp://example.com/a.jpg", "https://", "https://ejemplo .com/a.jpg"]) {
      expect(errorDeEvento(formulario({ imagen }), AHORA)).toMatch(/imagen/);
    }
  });

  it("no acepta dos tipos con el mismo nombre", () => {
    const tipos = [
      { nombre: "General", precio: "1", cupo: "1" },
      { nombre: " general ", precio: "2", cupo: "2" },
    ];
    expect(errorDeEvento(formulario({ tiposEntrada: tipos }), AHORA)).toMatch(/mismo nombre/);
  });
});

describe("armarEventoParaEnviar y fechaInicialDeEvento", () => {
  it("arma el cuerpo de POST /eventos con números, fecha ISO y sin descripción vacía", () => {
    const cuerpo = armarEventoParaEnviar(formulario({ nombre: "  Recital de rock " }));

    expect(cuerpo).toEqual({
      nombre: "Recital de rock",
      categoriaId: "cat-1",
      fecha: new Date(2026, 11, 20, 21, 0).toISOString(),
      tiposEntrada: [
        { nombre: "General", precio: 15000, cupo: 100 },
        { nombre: "VIP", precio: 40000.5, cupo: 20 },
      ],
    });
    expect(armarEventoParaEnviar(formulario({ descripcion: " Bandas " })).descripcion).toBe("Bandas");
    expect(armarEventoParaEnviar(formulario({ imagen: " https://example.com/a.jpg " })).multimedia).toEqual([
      "https://example.com/a.jpg",
    ]);
  });

  it("propone una semana después, a las 21:00", () => {
    const fecha = fechaInicialDeEvento(AHORA);
    expect([fecha.getDate(), fecha.getHours(), fecha.getMinutes()]).toEqual([26, 21, 0]);
  });
});

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
    const eventos = [
      { id: "a", yaPaso: true },
      { id: "b", yaPaso: true },
    ];
    separarPorPeriodo(eventos);
    expect(eventos.map((e) => e.id)).toEqual(["a", "b"]);
  });
});
