import { iniciales, textoCantidadDeResenias, textoEventosCreados, textoPuntaje, urlDeFoto } from "./perfil";

describe("iniciales", () => {
  it("primera letra del nombre y del apellido, en mayúsculas y sin espacios de los bordes", () => {
    expect(iniciales({ nombre: "Carla", apellido: "Gómez" })).toBe("CG");
    expect(iniciales({ nombre: " ana", apellido: " pérez" })).toBe("AP");
  });

  it("con un nombre compuesto toma solo la primera letra de cada campo", () => {
    expect(iniciales({ nombre: "Carla María", apellido: "Gómez Paz" })).toBe("CG");
  });
});

describe("textoEventosCreados", () => {
  it("nombra solo lo que no está en cero, en singular o plural", () => {
    expect(textoEventosCreados({ proximos: 2, realizados: 1, cancelados: 0 })).toBe("2 próximos · 1 realizado");
    expect(textoEventosCreados({ proximos: 0, realizados: 0, cancelados: 3 })).toBe("3 cancelados");
  });

  it("sin eventos dice que no creó ninguno", () => {
    expect(textoEventosCreados({ proximos: 0, realizados: 0, cancelados: 0 })).toBe("Ninguno todavía");
  });
});

describe("puntaje y reseñas", () => {
  it("el puntaje va con estrella y un decimal; sin reseñas, una raya", () => {
    expect(textoPuntaje(4.5)).toBe("★ 4.5");
    expect(textoPuntaje(3)).toBe("★ 3.0");
    expect(textoPuntaje(null)).toBe("—");
  });

  it("la cantidad de reseñas en singular o plural", () => {
    expect(textoCantidadDeResenias(0)).toBe("Sin reseñas");
    expect(textoCantidadDeResenias(1)).toBe("1 reseña");
    expect(textoCantidadDeResenias(4)).toBe("4 reseñas");
  });
});

describe("urlDeFoto", () => {
  it("antepone la dirección del servidor a la ruta, sin barras dobles", () => {
    expect(urlDeFoto("/usuarios/u1/foto?v=2", "http://192.168.1.15:3000")).toBe(
      "http://192.168.1.15:3000/usuarios/u1/foto?v=2",
    );
    expect(urlDeFoto("/usuarios/u1/foto?v=2", "http://192.168.1.15:3000/")).toBe(
      "http://192.168.1.15:3000/usuarios/u1/foto?v=2",
    );
  });

  it("sin foto, no hay URL", () => {
    expect(urlDeFoto(null, "http://192.168.1.15:3000")).toBeNull();
    expect(urlDeFoto(undefined, "http://192.168.1.15:3000")).toBeNull();
  });
});
