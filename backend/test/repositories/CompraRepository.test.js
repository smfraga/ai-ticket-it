import { beforeEach, describe, expect, it } from "@jest/globals";
import { CompraRepository } from "../../repositories/CompraRepository.js";
import { crearComprador, crearCompra, crearEvento, enDias } from "../helpers/domainFactories.js";

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

  describe("búsquedas", () => {
    let carla;
    let camilo;
    let evento;
    let otroEvento;

    beforeEach(() => {
      carla = crearComprador({ id: "carla" });
      camilo = crearComprador({ id: "camilo", email: "camilo@example.com" });
      evento = crearEvento();
      evento.id = "evento-1";
      otroEvento = crearEvento();
      otroEvento.id = "evento-2";
    });

    it("findByCompradorId devuelve solo las compras de ese comprador, las más recientes primero", async () => {
      const vieja = await repositorio.save(crearCompra({ comprador: carla, evento, ahora: enDias(-3) }));
      const nueva = await repositorio.save(crearCompra({ comprador: carla, evento: otroEvento, ahora: enDias(-1) }));
      await repositorio.save(crearCompra({ comprador: camilo, evento }));

      expect(await repositorio.findByCompradorId("carla")).toEqual([nueva, vieja]);
    });

    it("findByCompradorId devuelve una lista vacía si no compró nada", async () => {
      expect(await repositorio.findByCompradorId("nadie")).toEqual([]);
    });

    it("findByEventoId devuelve solo las compras de ese evento, las más recientes primero", async () => {
      const vieja = await repositorio.save(crearCompra({ comprador: carla, evento, ahora: enDias(-3) }));
      const nueva = await repositorio.save(crearCompra({ comprador: camilo, evento, ahora: enDias(-1) }));
      await repositorio.save(crearCompra({ comprador: carla, evento: otroEvento }));

      expect(await repositorio.findByEventoId("evento-1")).toEqual([nueva, vieja]);
    });

    it("findByEventoId devuelve una lista vacía si el evento no tiene compras", async () => {
      expect(await repositorio.findByEventoId("sin-ventas")).toEqual([]);
    });
  });
});
