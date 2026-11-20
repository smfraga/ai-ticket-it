import { errorDePerfil, LARGO_MAXIMO_DE_NOMBRE, perfilCambio } from "./perfil";

describe("errorDePerfil", () => {
  it("con nombre y apellido no hay error", () => {
    expect(errorDePerfil({ nombre: "Carla", apellido: "Gómez" })).toBeNull();
  });

  it("nombre o apellido vacíos (o solo espacios) no se pueden enviar", () => {
    expect(errorDePerfil({ nombre: "   ", apellido: "Gómez" })).toBe("Escribí tu nombre.");
    expect(errorDePerfil({ nombre: "Carla", apellido: "" })).toBe("Escribí tu apellido.");
  });

  it("respeta el tope del backend sin contar los espacios de los bordes", () => {
    const justo = "a".repeat(LARGO_MAXIMO_DE_NOMBRE);

    expect(errorDePerfil({ nombre: ` ${justo} `, apellido: "Gómez" })).toBeNull();
    expect(errorDePerfil({ nombre: `${justo}a`, apellido: "Gómez" })).toBe("El nombre puede tener hasta 60 letras.");
    expect(errorDePerfil({ nombre: "Carla", apellido: `${justo}a` })).toBe("El apellido puede tener hasta 60 letras.");
  });
});

describe("perfilCambio", () => {
  const carla = { nombre: "Carla", apellido: "Gómez" };

  it("sin cambios (o solo con espacios de más) no hay nada que enviar", () => {
    expect(perfilCambio(carla, { nombre: "Carla", apellido: "Gómez" })).toBe(false);
    expect(perfilCambio(carla, { nombre: " Carla ", apellido: "Gómez  " })).toBe(false);
  });

  it("cualquiera de los dos distinto es un cambio", () => {
    expect(perfilCambio(carla, { nombre: "Carla María", apellido: "Gómez" })).toBe(true);
    expect(perfilCambio(carla, { nombre: "Carla", apellido: "Paz" })).toBe(true);
  });
});
