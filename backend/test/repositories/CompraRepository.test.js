import { beforeEach, describe, expect, it } from "@jest/globals";
import { CompraRepository } from "../../repositories/CompraRepository.js";
import { crearCompra } from "../helpers/domainFactories.js";

describe("CompraRepository", () => {
  let repositorio;

  beforeEach(() => {
    repositorio = new CompraRepository();
  });

  it("save asigna un id a la compra nueva y la devuelve", async () => {
    const compra = crearCompra();

    const guardada = await repositorio.save(compra);

    expect(guardada).toBe(compra);
    expect(typeof guardada.id).toBe("string");
  });

  it("save conserva el id si la compra ya lo tenía, sin duplicarla", async () => {
    const compra = crearCompra();
    compra.id = "compra-fija";

    await repositorio.save(compra);
    await repositorio.save(compra);

    expect(compra.id).toBe("compra-fija");
    expect(repositorio.compras.size).toBe(1);
  });

  it("findById devuelve la compra guardada", async () => {
    const compra = await repositorio.save(crearCompra());

    expect(await repositorio.findById(compra.id)).toBe(compra);
  });

  it("findById devuelve null si no existe", async () => {
    expect(await repositorio.findById("no-existe")).toBeNull();
  });
});
