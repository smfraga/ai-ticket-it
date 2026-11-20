import {
  imagenesParaSubir,
  imagenesQueFaltan,
  MAXIMO_DE_IMAGENES,
  multimediaConservada,
  subirImagenes,
  textoDeImagenesSinSubir,
  urlDeImagen,
} from "./eventos";

const API = "http://192.168.0.10:3000";
const existente = (url) => ({ url });
const nueva = (n) => ({ uri: `file:///galeria/${n}.jpg`, dataUrl: `data:image/jpeg;base64,${n}` });

describe("urlDeImagen", () => {
  it("a una ruta del servidor le antepone su dirección (sin barras dobles)", () => {
    expect(urlDeImagen("/eventos/e1/imagenes/i1", API)).toBe(`${API}/eventos/e1/imagenes/i1`);
    expect(urlDeImagen("/eventos/e1/imagenes/i1", `${API}/`)).toBe(`${API}/eventos/e1/imagenes/i1`);
  });

  it("una URL completa (las del seed) queda igual, y sin imagen da null", () => {
    expect(urlDeImagen("https://images.unsplash.com/a.jpg", API)).toBe("https://images.unsplash.com/a.jpg");
    expect(urlDeImagen(undefined, API)).toBeNull();
    expect(urlDeImagen("", API)).toBeNull();
  });
});

describe("imágenes del formulario", () => {
  const imagenes = [existente("https://a.jpg"), nueva(1), existente("/eventos/e1/imagenes/i1"), nueva(2)];

  it("cuántas se pueden elegir todavía, sin bajar de 0", () => {
    expect(MAXIMO_DE_IMAGENES).toBe(6);
    expect(imagenesQueFaltan([])).toBe(6);
    expect(imagenesQueFaltan(imagenes)).toBe(2);
    expect(imagenesQueFaltan([...imagenes, ...imagenes])).toBe(0);
  });

  it("separa las que ya tenía el evento de las que hay que subir, conservando el orden", () => {
    expect(multimediaConservada(imagenes)).toEqual(["https://a.jpg", "/eventos/e1/imagenes/i1"]);
    expect(imagenesParaSubir(imagenes)).toEqual(["data:image/jpeg;base64,1", "data:image/jpeg;base64,2"]);
  });
});

describe("subirImagenes", () => {
  it("sube de a una, en orden, y devuelve 0 si salieron todas", async () => {
    const subidas = [];
    const subir = async (eventoId, dataUrl) => subidas.push([eventoId, dataUrl]);

    expect(await subirImagenes("e1", ["a", "b", "c"], subir)).toBe(0);
    expect(subidas).toEqual([
      ["e1", "a"],
      ["e1", "b"],
      ["e1", "c"],
    ]);
  });

  it("si una falla sigue con las demás y cuenta las fallidas", async () => {
    const subidas = [];
    const subir = async (_, dataUrl) => {
      if (dataUrl === "b") throw new Error("413");
      subidas.push(dataUrl);
    };

    expect(await subirImagenes("e1", ["a", "b", "c"], subir)).toBe(1);
    expect(subidas).toEqual(["a", "c"]);
  });

  it("sin imágenes no hace pedidos", async () => {
    let pedidos = 0;
    expect(await subirImagenes("e1", [], async () => pedidos++)).toBe(0);
    expect(pedidos).toBe(0);
  });
});

describe("textoDeImagenesSinSubir", () => {
  it("nada si se subieron todas; singular y plural si no", () => {
    expect(textoDeImagenesSinSubir(0)).toBeNull();
    expect(textoDeImagenesSinSubir(1)).toBe("No se pudo subir 1 imagen: probá de nuevo desde Editar evento.");
    expect(textoDeImagenesSinSubir(3)).toBe("No se pudieron subir 3 imágenes: probá de nuevo desde Editar evento.");
  });
});
