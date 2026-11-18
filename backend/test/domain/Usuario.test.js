import { describe, expect, it } from "@jest/globals";
import { rolUsuario } from "../../domain/RolUsuario.js";
import { Usuario } from "../../domain/Usuario.js";
import { ValidationError } from "../../errors/AppError.js";
import { HASH, crearUsuario } from "../helpers/domainFactories.js";

const { COMPRADOR, ORGANIZADOR } = rolUsuario;

function usuarioCon(cambios = {}) {
  const datos = {
    nombre: "Ana",
    apellido: "Pérez",
    email: "ana@example.com",
    passwordHash: HASH,
    roles: [COMPRADOR],
    ...cambios,
  };
  return new Usuario(datos.nombre, datos.apellido, datos.email, datos.passwordHash, datos.roles);
}

describe("Usuario", () => {
  it("se construye con sus datos y sin favoritos", () => {
    const usuario = usuarioCon();

    expect(usuario.nombre).toBe("Ana");
    expect(usuario.apellido).toBe("Pérez");
    expect(usuario.email).toBe("ana@example.com");
    expect(usuario.passwordHash).toBe(HASH);
    expect(usuario.roles).toEqual([COMPRADOR]);
    expect(usuario.favoritos).toEqual([]);
  });

  it("normaliza el email a minúsculas y sin espacios", () => {
    expect(usuarioCon({ email: "  Ana@Example.COM " }).email).toBe("ana@example.com");
  });

  it("puede ser comprador y organizador a la vez", () => {
    const usuario = usuarioCon({ roles: [COMPRADOR, ORGANIZADOR] });

    expect(usuario.tieneRol(COMPRADOR)).toBe(true);
    expect(usuario.tieneRol(ORGANIZADOR)).toBe(true);
  });

  it("no tiene un rol que no se le asignó", () => {
    expect(usuarioCon({ roles: [COMPRADOR] }).tieneRol(ORGANIZADOR)).toBe(false);
  });

  it.each([null, undefined, "", "   ", 42])("lanza ValidationError si el email es %p", (email) => {
    expect(() => usuarioCon({ email })).toThrow(ValidationError);
  });

  it.each([
    ["sin nombre", { nombre: "   " }, "El usuario debe tener un nombre"],
    ["sin apellido", { apellido: undefined }, "El usuario debe tener un apellido"],
    ["con un email sin formato", { email: "ana-sin-arroba" }, "El email del usuario no es válido"],
    ["sin contraseña", { passwordHash: "" }, "El usuario debe tener una contraseña"],
    ["sin roles", { roles: [] }, "El usuario debe tener al menos un rol"],
    ["con roles que no son lista", { roles: COMPRADOR }, "El usuario debe tener al menos un rol"],
    ["con un rol desconocido", { roles: ["ADMIN"] }, "El rol del usuario debe ser COMPRADOR u ORGANIZADOR"],
    ["con roles repetidos", { roles: [COMPRADOR, COMPRADOR] }, "El usuario no puede tener roles repetidos"],
  ])("lanza ValidationError %s", (_, cambios, mensaje) => {
    expect(() => usuarioCon(cambios)).toThrow(ValidationError);
    expect(() => usuarioCon(cambios)).toThrow(mensaje);
  });

  describe("esElMismo", () => {
    it("compara por id cuando ambos lo tienen", () => {
      const usuario = crearUsuario();
      usuario.id = "u-1";
      const mismoUsuario = crearUsuario();
      mismoUsuario.id = "u-1";
      const otroUsuario = crearUsuario();
      otroUsuario.id = "u-2";

      expect(usuario.esElMismo(mismoUsuario)).toBe(true);
      expect(usuario.esElMismo(otroUsuario)).toBe(false);
    });

    it("compara por referencia cuando todavía no tienen id", () => {
      const usuario = crearUsuario();

      expect(usuario.esElMismo(usuario)).toBe(true);
      expect(usuario.esElMismo(crearUsuario())).toBe(false);
    });

    it("es falso contra null", () => {
      expect(crearUsuario().esElMismo(null)).toBe(false);
    });
  });
});
