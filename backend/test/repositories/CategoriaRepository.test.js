import { beforeEach, describe, expect, it } from "@jest/globals";
import { CategoriaRepository } from "../../repositories/CategoriaRepository.js";
import { crearCategoria } from "../helpers/domainFactories.js";

describe("CategoriaRepository", () => {
  let repositorio;

  beforeEach(() => {
    repositorio = new CategoriaRepository();
  });

  it("save asigna un id a la categoría nueva y la devuelve", async () => {
    const categoria = crearCategoria();

    const guardada = await repositorio.save(categoria);

    expect(guardada).toBe(categoria);
    expect(typeof guardada.id).toBe("string");
  });

  it("save conserva el id si la categoría ya lo tenía", async () => {
    const categoria = crearCategoria();
    categoria.id = "id-fijo";

    await repositorio.save(categoria);

    expect(categoria.id).toBe("id-fijo");
    expect(await repositorio.findById("id-fijo")).toBe(categoria);
  });

  it("findById devuelve null si no existe", async () => {
    expect(await repositorio.findById("no-existe")).toBeNull();
  });

  it("findAll devuelve todas ordenadas por nombre, sin distinguir tildes del español", async () => {
    await repositorio.save(crearCategoria({ nombre: "Teatro" }));
    await repositorio.save(crearCategoria({ nombre: "Deportes" }));
    await repositorio.save(crearCategoria({ nombre: "Álbumes en vivo" }));

    const nombres = (await repositorio.findAll()).map((categoria) => categoria.nombre);

    expect(nombres).toEqual(["Álbumes en vivo", "Deportes", "Teatro"]);
  });

  it("findAll devuelve una lista vacía si no hay categorías", async () => {
    expect(await repositorio.findAll()).toEqual([]);
  });
});
