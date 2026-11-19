import { describe, expect, it } from "@jest/globals";
import { rolUsuario } from "../../domain/RolUsuario.js";
import { Usuario } from "../../domain/Usuario.js";
import { ForbiddenError, ValidationError } from "../../errors/AppError.js";
import { HASH, crearEvento, crearUsuario } from "../helpers/domainFactories.js";

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

  describe("favoritos", () => {
    const eventoCon = (id) => Object.assign(crearEvento(), { id });

    it("agregarFavorito guarda el evento y devuelve true", () => {
      const comprador = usuarioCon();
      const evento = eventoCon("e1");

      expect(comprador.agregarFavorito(evento)).toBe(true);

      expect(comprador.favoritos).toEqual([evento]);
      expect(comprador.esFavorito(evento)).toBe(true);
    });

    it("agregar un evento que ya era favorito devuelve false y no lo duplica", () => {
      const comprador = usuarioCon();
      comprador.agregarFavorito(eventoCon("e1"));

      expect(comprador.agregarFavorito(eventoCon("e1"))).toBe(false);

      expect(comprador.favoritos).toHaveLength(1);
    });

    it("compara los eventos por id, y por referencia si todavía no tienen", () => {
      const comprador = usuarioCon();
      const sinId = crearEvento();
      const otroSinId = crearEvento();

      comprador.agregarFavorito(sinId);

      expect(comprador.esFavorito(sinId)).toBe(true);
      expect(comprador.esFavorito(otroSinId)).toBe(false);
    });

    it("quitarFavorito saca solo ese evento y devuelve true", () => {
      const comprador = usuarioCon();
      const uno = eventoCon("e1");
      const dos = eventoCon("e2");
      comprador.agregarFavorito(uno);
      comprador.agregarFavorito(dos);

      expect(comprador.quitarFavorito(uno)).toBe(true);

      expect(comprador.favoritos).toEqual([dos]);
      expect(comprador.esFavorito(uno)).toBe(false);
    });

    it("quitar un evento que no era favorito devuelve false y no cambia nada", () => {
      const comprador = usuarioCon();
      comprador.agregarFavorito(eventoCon("e1"));

      expect(comprador.quitarFavorito(eventoCon("e2"))).toBe(false);

      expect(comprador.favoritos).toHaveLength(1);
    });

    it("listarFavoritos devuelve el último guardado primero, en una copia", () => {
      const comprador = usuarioCon();
      const uno = eventoCon("e1");
      const dos = eventoCon("e2");
      const tres = eventoCon("e3");
      [uno, dos, tres].forEach((evento) => comprador.agregarFavorito(evento));

      const lista = comprador.listarFavoritos();

      expect(lista).toEqual([tres, dos, uno]);
      lista.pop();
      expect(comprador.favoritos).toHaveLength(3);
    });

    it("un comprador sin favoritos devuelve una lista vacía", () => {
      expect(usuarioCon().listarFavoritos()).toEqual([]);
    });

    it("cada usuario tiene su propia lista", () => {
      const carla = usuarioCon();
      const camilo = usuarioCon({ email: "camilo@example.com" });

      carla.agregarFavorito(eventoCon("e1"));

      expect(camilo.favoritos).toEqual([]);
    });

    it("lanza ForbiddenError si el usuario no es comprador, en las tres operaciones", () => {
      const organizador = usuarioCon({ roles: [ORGANIZADOR] });
      const evento = eventoCon("e1");

      expect(() => organizador.agregarFavorito(evento)).toThrow(ForbiddenError);
      expect(() => organizador.agregarFavorito(evento)).toThrow("Solo un comprador puede guardar eventos favoritos");
      expect(() => organizador.quitarFavorito(evento)).toThrow(ForbiddenError);
      expect(() => organizador.listarFavoritos()).toThrow(ForbiddenError);
      expect(organizador.favoritos).toEqual([]);
    });

    it("un usuario que es comprador y organizador a la vez puede guardar favoritos", () => {
      const ambos = usuarioCon({ roles: [COMPRADOR, ORGANIZADOR] });

      expect(ambos.agregarFavorito(eventoCon("e1"))).toBe(true);
    });

    it("lanza ValidationError si no se indica el evento", () => {
      const comprador = usuarioCon();

      expect(() => comprador.agregarFavorito(null)).toThrow(ValidationError);
      expect(() => comprador.agregarFavorito(undefined)).toThrow("Hay que indicar el evento a guardar como favorito");
      expect(comprador.favoritos).toEqual([]);
    });
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
