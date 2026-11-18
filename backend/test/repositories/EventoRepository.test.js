import { beforeEach, describe, expect, it } from "@jest/globals";
import { EventoRepository } from "../../repositories/EventoRepository.js";
import { crearEvento } from "../helpers/domainFactories.js";

describe("EventoRepository", () => {
  let repositorio;

  beforeEach(() => {
    repositorio = new EventoRepository();
  });

  describe("save", () => {
    it("asigna un id al evento nuevo y lo devuelve", async () => {
      const evento = crearEvento();

      const guardado = await repositorio.save(evento);

      expect(guardado).toBe(evento);
      expect(typeof guardado.id).toBe("string");
    });

    it("asigna un id distinto a cada tipo de entrada del evento", async () => {
      const evento = await repositorio.save(crearEvento());

      const ids = evento.tiposEntrada.map((tipo) => tipo.id);

      expect(ids).toHaveLength(2);
      ids.forEach((id) => expect(typeof id).toBe("string"));
      expect(new Set(ids).size).toBe(2);
    });

    it("conserva los ids que ya tenían el evento y sus tipos de entrada", async () => {
      const evento = crearEvento();
      evento.id = "evento-fijo";
      evento.tiposEntrada[0].id = "tipo-fijo";

      await repositorio.save(evento);

      expect(evento.id).toBe("evento-fijo");
      expect(evento.tiposEntrada[0].id).toBe("tipo-fijo");
      expect(typeof evento.tiposEntrada[1].id).toBe("string");
    });

    it("guardar de nuevo el mismo evento no lo duplica", async () => {
      const evento = await repositorio.save(crearEvento());

      await repositorio.save(evento);

      expect(await repositorio.findAll()).toHaveLength(1);
    });
  });

  it("findById devuelve el evento guardado", async () => {
    const evento = await repositorio.save(crearEvento());

    expect(await repositorio.findById(evento.id)).toBe(evento);
  });

  it("findById devuelve null si no existe", async () => {
    expect(await repositorio.findById("no-existe")).toBeNull();
  });

  describe("findAll", () => {
    it("devuelve todos los eventos guardados", async () => {
      const uno = await repositorio.save(crearEvento());
      const otro = await repositorio.save(crearEvento());

      expect(await repositorio.findAll()).toEqual([uno, otro]);
    });

    it("devuelve una lista vacía si no hay eventos", async () => {
      expect(await repositorio.findAll()).toEqual([]);
    });

    it("devuelve una copia: modificar la lista no altera lo guardado", async () => {
      await repositorio.save(crearEvento());

      (await repositorio.findAll()).pop();

      expect(await repositorio.findAll()).toHaveLength(1);
    });
  });
});
