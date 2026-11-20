import { erroresDeLogin, erroresDelServidor, erroresDeRegistro, hayErrores } from "./formularios";

describe("erroresDeLogin", () => {
  it("marca cada campo vacío por separado", () => {
    expect(erroresDeLogin({ email: " ", password: "" })).toEqual({
      email: "Escribí tu email.",
      password: "Escribí tu contraseña.",
    });
    expect(erroresDeLogin({ email: "ana@mail.com", password: "" })).toEqual({ password: "Escribí tu contraseña." });
  });

  it("completo no tiene errores", () => {
    const errores = erroresDeLogin({ email: "ana@mail.com", password: "x" });
    expect(errores).toEqual({});
    expect(hayErrores(errores)).toBe(false);
  });
});

describe("erroresDeRegistro", () => {
  const datos = (cambios = {}) => ({
    nombre: "Ana",
    apellido: "Pérez",
    email: "ana@mail.com",
    password: "12345678",
    ...cambios,
  });

  it("válido, con al menos un rol, no tiene errores", () => {
    expect(erroresDeRegistro(datos(), ["COMPRADOR"])).toEqual({});
  });

  it("marca cada campo con su problema, a la vez", () => {
    const errores = erroresDeRegistro(datos({ nombre: " ", apellido: "", email: "", password: "corta" }), []);

    expect(errores).toEqual({
      nombre: "Escribí tu nombre.",
      apellido: "Escribí tu apellido.",
      email: "Escribí tu email.",
      password: "La contraseña tiene que tener al menos 8 caracteres.",
      roles: "Elegí al menos un rol.",
    });
    expect(hayErrores(errores)).toBe(true);
  });

  it("el email tiene que tener formato de email", () => {
    for (const email of ["ana", "ana@mail", "ana mail@x.com", "@mail.com"]) {
      expect(erroresDeRegistro(datos({ email }), ["COMPRADOR"]).email).toMatch(/no es válido/);
    }
  });

  it("la contraseña de 8 caracteres justos alcanza; de 7, no", () => {
    expect(erroresDeRegistro(datos({ password: "12345678" }), ["COMPRADOR"]).password).toBeUndefined();
    expect(erroresDeRegistro(datos({ password: "1234567" }), ["COMPRADOR"]).password).toBeDefined();
  });
});

describe("erroresDelServidor", () => {
  const error400 = {
    status: 400,
    details: [
      { path: ["email"], message: "El email no es válido" },
      { path: ["email"], message: "Otro problema del email" },
      { path: ["password"], message: "La contraseña debe tener al menos 8 caracteres" },
      { path: ["roles"], message: "El usuario debe tener al menos un rol" },
      { path: [], message: "Un problema general" },
    ],
  };

  it("ubica cada problema en su campo, el primero de cada uno, y solo los campos pedidos", () => {
    expect(erroresDelServidor(error400, ["email", "password"])).toEqual({
      email: "El email no es válido",
      password: "La contraseña debe tener al menos 8 caracteres",
    });
  });

  it("sin detalles (un 409 o un error de conexión) no ubica nada", () => {
    expect(erroresDelServidor({ status: 409, message: "El email ya está registrado" }, ["email"])).toEqual({});
    expect(erroresDelServidor(undefined, ["email"])).toEqual({});
  });
});
