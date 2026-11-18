import { beforeEach, describe, expect, it } from "@jest/globals";
import { UsuarioRepository } from "../../repositories/UsuarioRepository.js";
import { crearUsuario } from "../helpers/domainFactories.js";

describe("UsuarioRepository", () => {
  let repositorio;

  beforeEach(() => {
    repositorio = new UsuarioRepository();
  });

  describe("save", () => {
    it("asigna un id al usuario nuevo y lo devuelve", async () => {
      const usuario = crearUsuario();

      const guardado = await repositorio.save(usuario);

      expect(guardado).toBe(usuario);
      expect(typeof guardado.id).toBe("string");
      expect(guardado.id).not.toBe("");
    });

    it("asigna ids distintos a usuarios distintos", async () => {
      const uno = await repositorio.save(crearUsuario());
      const otro = await repositorio.save(crearUsuario());

      expect(uno.id).not.toBe(otro.id);
    });

    it("conserva el id si el usuario ya lo tenía, sin duplicarlo", async () => {
      const usuario = await repositorio.save(crearUsuario());
      const id = usuario.id;

      await repositorio.save(usuario);

      expect(usuario.id).toBe(id);
      expect(repositorio.usuarios.size).toBe(1);
    });
  });

  describe("findById", () => {
    it("devuelve el usuario guardado", async () => {
      const usuario = await repositorio.save(crearUsuario());

      expect(await repositorio.findById(usuario.id)).toBe(usuario);
    });

    it("devuelve null si no existe", async () => {
      expect(await repositorio.findById("no-existe")).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("encuentra al usuario por su email", async () => {
      const usuario = await repositorio.save(crearUsuario({ email: "ana@example.com" }));

      expect(await repositorio.findByEmail("ana@example.com")).toBe(usuario);
    });

    it("ignora mayúsculas y espacios en el email buscado", async () => {
      const usuario = await repositorio.save(crearUsuario({ email: "ana@example.com" }));

      expect(await repositorio.findByEmail("  ANA@Example.com ")).toBe(usuario);
    });

    it("devuelve null si ningún usuario tiene ese email", async () => {
      await repositorio.save(crearUsuario({ email: "ana@example.com" }));

      expect(await repositorio.findByEmail("otra@example.com")).toBeNull();
    });
  });
});
