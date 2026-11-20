import { agregarPagina, hayMasPaginas, textoDeCantidad } from "./eventos";

const eventos = (...ids) => ids.map((id) => ({ id }));

describe("hayMasPaginas (con la página y el total de páginas de la respuesta paginada)", () => {
  it("hay más si la página que llegó no es la última", () => {
    expect(hayMasPaginas(1, 4)).toBe(true);
    expect(hayMasPaginas(3, 4)).toBe(true);
  });

  it("no hay más en la última página, ni si no hay ninguna", () => {
    expect(hayMasPaginas(4, 4)).toBe(false);
    expect(hayMasPaginas(1, 0)).toBe(false);
  });
});

describe("agregarPagina", () => {
  it("suma la página nueva al final, en su orden", () => {
    expect(agregarPagina(eventos("a", "b"), eventos("c", "d"))).toEqual(eventos("a", "b", "c", "d"));
  });

  it("no repite un evento que ya estaba (el catálogo cambió entre una página y otra)", () => {
    expect(agregarPagina(eventos("a", "b"), eventos("b", "c"))).toEqual(eventos("a", "b", "c"));
  });

  it("no modifica la lista anterior", () => {
    const previos = eventos("a");
    agregarPagina(previos, eventos("b"));
    expect(previos).toEqual(eventos("a"));
  });
});

describe("textoDeCantidad", () => {
  it("mientras quedan páginas, cuántos se ven de cuántos hay", () => {
    expect(textoDeCantidad(10, 37)).toBe("Mostrando 10 de 37 eventos");
  });

  it("con todos a la vista, solo el total", () => {
    expect(textoDeCantidad(37, 37)).toBe("Mostrando los 37 eventos");
    expect(textoDeCantidad(1, 1)).toBe("Mostrando el único evento");
  });

  it("sin eventos no muestra nada (ya lo dice la lista vacía)", () => {
    expect(textoDeCantidad(0, 0)).toBeNull();
  });
});
