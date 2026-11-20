import {
  armarEdicionParaEnviar,
  armarEventoParaEnviar,
  errorDeEvento,
  eventoAFormulario,
  puedeGestionarEvento,
} from "./eventos";

const AHORA = new Date(2026, 10, 19, 12, 0);

// Como lo devuelve GET /eventos/:id: General con 4 vendidas (cupo 120, disponibles 116), Mesa sin ventas.
const eventoDelBackend = {
  id: "ev-1",
  nombre: "Noche de Stand Up",
  descripcion: "Seis humoristas",
  categoria: { id: "cat-1", nombre: "Teatro" },
  fecha: "2026-11-25T00:30:00.000Z",
  multimedia: ["https://ejemplo.com/1.jpg", "https://ejemplo.com/2.jpg"],
  tiposEntrada: [
    { id: "t-general", nombre: "General", precio: 6000, cupo: 120, disponibles: 116 },
    { id: "t-mesa", nombre: "Mesa", precio: 9000, cupo: 40, disponibles: 40 },
  ],
};

describe("eventoAFormulario", () => {
  it("pasa el evento a la forma del formulario, con lo vendido de cada tipo", () => {
    expect(eventoAFormulario(eventoDelBackend)).toEqual({
      nombre: "Noche de Stand Up",
      descripcion: "Seis humoristas",
      imagenes: [{ url: "https://ejemplo.com/1.jpg" }, { url: "https://ejemplo.com/2.jpg" }],
      categoriaId: "cat-1",
      fecha: new Date("2026-11-25T00:30:00.000Z"),
      tiposEntrada: [
        { id: "t-general", nombre: "General", precio: "6000", cupo: "120", vendidas: 4 },
        { id: "t-mesa", nombre: "Mesa", precio: "9000", cupo: "40", vendidas: 0 },
      ],
    });
  });

  it("sin multimedia ni descripción deja los campos vacíos", () => {
    const formulario = eventoAFormulario({ ...eventoDelBackend, multimedia: [], descripcion: undefined });

    expect(formulario.imagenes).toEqual([]);
    expect(formulario.descripcion).toBe("");
  });
});

describe("errorDeEvento al editar", () => {
  const conCupo = (cupo) => ({
    ...eventoAFormulario(eventoDelBackend),
    fecha: new Date(2026, 11, 20, 21, 0),
    tiposEntrada: [{ id: "t-general", nombre: "General", precio: "6000", cupo, vendidas: 4 }],
  });

  it("no deja el cupo de un tipo con ventas por debajo de lo vendido", () => {
    expect(errorDeEvento(conCupo("3"), AHORA)).toBe(
      "Tipo de entrada 1: el cupo no puede ser menor a las 4 entradas vendidas.",
    );
  });

  it("acepta un cupo igual o mayor a lo vendido", () => {
    expect(errorDeEvento(conCupo("4"), AHORA)).toBeNull();
    expect(errorDeEvento(conCupo("200"), AHORA)).toBeNull();
  });
});

describe("armarEdicionParaEnviar", () => {
  const formulario = (cambios = {}) => ({ ...eventoAFormulario(eventoDelBackend), ...cambios });

  it("manda todo el formulario, con id en los tipos existentes y sin id en los nuevos", () => {
    const cuerpo = armarEdicionParaEnviar(
      formulario({
        nombre: "  Stand Up  ",
        tiposEntrada: [
          { id: "t-general", nombre: "General", precio: "6000", cupo: "150", vendidas: 4 },
          { nombre: "Palco", precio: "15000,50", cupo: "10" },
        ],
      }),
    );

    expect(cuerpo).toEqual({
      nombre: "Stand Up",
      descripcion: "Seis humoristas",
      categoriaId: "cat-1",
      fecha: "2026-11-25T00:30:00.000Z",
      multimedia: ["https://ejemplo.com/1.jpg", "https://ejemplo.com/2.jpg"],
      tiposEntrada: [
        { id: "t-general", nombre: "General", precio: 6000, cupo: 150 },
        { nombre: "Palco", precio: 15000.5, cupo: 10 },
      ],
    });
  });

  it("manda la descripción vacía para poder borrarla", () => {
    expect(armarEdicionParaEnviar(formulario({ descripcion: "  " })).descripcion).toBe("");
  });

  it("en multimedia van solo las imágenes que ya tenía y siguen, en orden; las nuevas no", () => {
    const ruta = "/eventos/ev-1/imagenes/img-1";
    const imagenes = [
      { url: ruta },
      { uri: "file:///nueva.jpg", dataUrl: "data:image/jpeg;base64,AAAA" },
      { url: "https://ejemplo.com/2.jpg" },
    ];

    expect(armarEdicionParaEnviar(formulario({ imagenes })).multimedia).toEqual([ruta, "https://ejemplo.com/2.jpg"]);
  });

  it("si se quitaron todas, manda multimedia vacía (el backend descarta los bytes)", () => {
    expect(armarEdicionParaEnviar(formulario({ imagenes: [] })).multimedia).toEqual([]);
  });
});

describe("armarEventoParaEnviar (crear)", () => {
  it("no manda id en los tipos, porque son todos nuevos", () => {
    const cuerpo = armarEventoParaEnviar({
      nombre: "Recital",
      descripcion: "",
      categoriaId: "cat-1",
      fecha: new Date(2026, 11, 20, 21, 0),
      tiposEntrada: [{ nombre: "General", precio: "100", cupo: "10" }],
    });

    expect(cuerpo.tiposEntrada).toEqual([{ nombre: "General", precio: 100, cupo: 10 }]);
  });
});

describe("puedeGestionarEvento", () => {
  it("solo un evento próximo y no cancelado", () => {
    expect(puedeGestionarEvento({ yaPaso: false, cancelado: false })).toBe(true);
    expect(puedeGestionarEvento({ yaPaso: true, cancelado: false })).toBe(false);
    expect(puedeGestionarEvento({ yaPaso: false, cancelado: true })).toBe(false);
  });
});
