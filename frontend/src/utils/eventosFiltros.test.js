import { FILTROS_POR_DEFECTO, filtrosActivos, sinFiltro, tituloDelBotonDeFiltros } from "./eventos";

const listas = {
  categorias: [
    { id: "cat-teatro", nombre: "Teatro" },
    { id: "cat-rock", nombre: "Recitales" },
  ],
  periodos: [
    { valor: "proximos", etiqueta: "Próximos" },
    { valor: "pasados", etiqueta: "Pasados" },
    { valor: "todos", etiqueta: "Todos" },
  ],
  ordenes: [
    { valor: "fecha", etiqueta: "Fecha" },
    { valor: "precio", etiqueta: "Precio" },
    { valor: "puntaje", etiqueta: "Puntaje" },
  ],
};

describe("filtrosActivos", () => {
  it("con los valores por defecto no hay filtros activos", () => {
    expect(filtrosActivos(FILTROS_POR_DEFECTO, listas)).toEqual([]);
  });

  it("muestra cada filtro cambiado con su etiqueta, en el orden de la hoja", () => {
    const filtros = { categoriaId: "cat-teatro", periodo: "pasados", rangoDePrecio: "masDe10000", orden: "puntaje" };
    expect(filtrosActivos(filtros, listas)).toEqual([
      { clave: "categoriaId", etiqueta: "Teatro" },
      { clave: "periodo", etiqueta: "Pasados" },
      { clave: "rangoDePrecio", etiqueta: "Más de $10.000" },
      { clave: "orden", etiqueta: "Orden: Puntaje" },
    ]);
  });

  it("solo cuenta los que no están en su valor por defecto", () => {
    const filtros = { ...FILTROS_POR_DEFECTO, rangoDePrecio: "hasta5000" };
    expect(filtrosActivos(filtros, listas)).toEqual([{ clave: "rangoDePrecio", etiqueta: "Hasta $5.000" }]);
  });

  it("si las categorías todavía no llegaron, la categoría elegida dice 'Categoría'", () => {
    const filtros = { ...FILTROS_POR_DEFECTO, categoriaId: "cat-teatro" };
    expect(filtrosActivos(filtros)).toEqual([{ clave: "categoriaId", etiqueta: "Categoría" }]);
  });
});

describe("sinFiltro", () => {
  it("vuelve un filtro a su valor por defecto sin tocar los demás", () => {
    const filtros = { categoriaId: "cat-rock", periodo: "todos", rangoDePrecio: "hasta5000", orden: "precio" };
    expect(sinFiltro(filtros, "periodo")).toEqual({ ...filtros, periodo: "proximos" });
    expect(sinFiltro(filtros, "categoriaId")).toEqual({ ...filtros, categoriaId: null });
  });

  it("no modifica el objeto original", () => {
    const filtros = { ...FILTROS_POR_DEFECTO, orden: "precio" };
    sinFiltro(filtros, "orden");
    expect(filtros.orden).toBe("precio");
  });
});

describe("tituloDelBotonDeFiltros", () => {
  it("muestra la cantidad solo si hay filtros activos", () => {
    expect(tituloDelBotonDeFiltros(0)).toBe("Filtros");
    expect(tituloDelBotonDeFiltros(2)).toBe("Filtros (2)");
  });
});
