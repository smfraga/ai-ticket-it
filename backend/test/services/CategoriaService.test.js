import { describe, expect, it, jest } from "@jest/globals";
import { CategoriaService } from "../../services/CategoriaService.js";
import { crearCategoria } from "../helpers/domainFactories.js";

describe("CategoriaService", () => {
  it("devuelve las categorías con id, nombre y descripción, en el orden del repositorio", async () => {
    const teatro = Object.assign(crearCategoria({ nombre: "Teatro", descripcion: "Obras" }), { id: "c-2" });
    const rock = Object.assign(crearCategoria({ nombre: "Rock", descripcion: "Bandas" }), { id: "c-1" });
    const repositorio = { findAll: jest.fn().mockResolvedValue([rock, teatro]) };

    const categorias = await new CategoriaService(repositorio).getAll();

    expect(categorias).toEqual([
      { id: "c-1", nombre: "Rock", descripcion: "Bandas" },
      { id: "c-2", nombre: "Teatro", descripcion: "Obras" },
    ]);
  });

  it("devuelve una lista vacía si no hay categorías", async () => {
    const repositorio = { findAll: jest.fn().mockResolvedValue([]) };

    expect(await new CategoriaService(repositorio).getAll()).toEqual([]);
  });
});
