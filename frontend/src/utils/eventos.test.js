import {
  armarEventoParaEnviar,
  avisoDeCupo,
  conFavorito,
  errorDeEvento,
  fechaInicialDeEvento,
  leerCupo,
  leerPrecio,
  parametrosDePrecio,
  RANGOS_DE_PRECIO,
  resumenDeFavoritos,
  separarPorPeriodo,
  textoCuentaRegresiva,
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

describe("textoCuentaRegresiva", () => {
  const evento = (cambios) => ({ cancelado: false, yaPaso: false, diasParaElEvento: 5, ...cambios });

  it("cuenta los días en singular y plural, y hoy", () => {
    expect(textoCuentaRegresiva(evento())).toBe("Faltan 5 días");
    expect(textoCuentaRegresiva(evento({ diasParaElEvento: 1 }))).toBe("Falta 1 día");
    expect(textoCuentaRegresiva(evento({ diasParaElEvento: 0 }))).toBe("Es hoy");
  });

  it("un evento realizado no cuenta días", () => {
    expect(textoCuentaRegresiva(evento({ yaPaso: true, diasParaElEvento: null }))).toBe("Ya se realizó");
  });

  it("cancelado gana aunque falten días o ya se haya realizado", () => {
    expect(textoCuentaRegresiva(evento({ cancelado: true }))).toBe("Cancelado");
    expect(textoCuentaRegresiva(evento({ cancelado: true, yaPaso: true, diasParaElEvento: null }))).toBe("Cancelado");
  });
});

describe("avisoDeCupo", () => {
  // Un solo tipo de entrada: `cupo` lugares, de los que quedan `disponibles`.
  const evento = (disponibles, cupo, cambios = {}) => ({
    cancelado: false,
    yaPaso: false,
    tiposEntrada: [{ disponibles, cupo }],
    ...cambios,
  });

  it("Agotado sin lugares", () => {
    expect(avisoDeCupo(evento(0, 300))).toBe("Agotado");
  });

  it("Quedan pocas con 20 o menos, aunque sean más del 10 % del cupo", () => {
    // Cupo 150: el 10 % son 15, así que solo decide la regla de los 20.
    expect(avisoDeCupo(evento(20, 150))).toBe("Quedan pocas");
    expect(avisoDeCupo(evento(21, 150))).toBeNull();
  });

  it("Quedan pocas con el 10 % del cupo o menos, aunque sean más de 20", () => {
    expect(avisoDeCupo(evento(30, 300))).toBe("Quedan pocas");
    expect(avisoDeCupo(evento(31, 300))).toBeNull();
  });

  it("suma los lugares de todos los tipos de entrada", () => {
    const dosTipos = {
      cancelado: false,
      yaPaso: false,
      tiposEntrada: [
        { disponibles: 15, cupo: 100 },
        { disponibles: 10, cupo: 100 },
      ],
    };
    expect(avisoDeCupo(dosTipos)).toBeNull(); // 25 de 200: más de 20 y más del 10 %
    expect(
      avisoDeCupo({
        ...dosTipos,
        tiposEntrada: [
          { disponibles: 0, cupo: 50 },
          { disponibles: 0, cupo: 10 },
        ],
      }),
    ).toBe("Agotado");
  });

  it("sin aviso si el evento ya se realizó o se canceló", () => {
    expect(avisoDeCupo(evento(0, 300, { yaPaso: true }))).toBeNull();
    expect(avisoDeCupo(evento(5, 300, { cancelado: true }))).toBeNull();
  });
});

describe("resumenDeFavoritos", () => {
  const evento = (diasParaElEvento, cambios = {}) => ({
    cancelado: false,
    yaPaso: diasParaElEvento === null,
    diasParaElEvento,
    ...cambios,
  });

  it("cuenta los guardados y dice cuánto falta para el más cercano", () => {
    expect(resumenDeFavoritos([evento(30), evento(null), evento(5)])).toBe("3 guardados · el próximo en 5 días");
  });

  it("hoy, mañana y en singular", () => {
    expect(resumenDeFavoritos([evento(0), evento(8)])).toBe("2 guardados · el próximo es hoy");
    expect(resumenDeFavoritos([evento(1)])).toBe("1 guardado · el próximo es mañana");
  });

  it("no toma como próximo un evento cancelado", () => {
    expect(resumenDeFavoritos([evento(2, { cancelado: true }), evento(9)])).toBe("2 guardados · el próximo en 9 días");
  });

  it("sin eventos por venir, solo la cantidad; sin favoritos, null", () => {
    expect(resumenDeFavoritos([evento(null), evento(3, { cancelado: true })])).toBe("2 guardados");
    expect(resumenDeFavoritos([])).toBeNull();
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

  it("las imágenes son opcionales, hasta 6", () => {
    const imagenes = (cantidad) =>
      Array.from({ length: cantidad }, (_, i) => ({ url: `https://example.com/${i}.jpg` }));

    expect(errorDeEvento(formulario({ imagenes: [] }), AHORA)).toBeNull();
    expect(errorDeEvento(formulario({ imagenes: imagenes(6) }), AHORA)).toBeNull();
    expect(errorDeEvento(formulario({ imagenes: imagenes(7) }), AHORA)).toBe("Podés tener hasta 6 imágenes.");
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
    // Las imágenes no van en este cuerpo: se suben después, una por pedido.
    const conImagenes = formulario({ imagenes: [{ uri: "file:///a.jpg", dataUrl: "data:image/jpeg;base64,AAAA" }] });
    expect(armarEventoParaEnviar(conImagenes)).not.toHaveProperty("multimedia");
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
