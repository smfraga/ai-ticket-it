import { beforeEach, describe, expect, it } from "@jest/globals";
import { ResenaRepository } from "../../repositories/ResenaRepository.js";
import {
  crearEvento,
  crearOrganizador,
  crearResenia,
} from "../helpers/domainFactories.js";

function reseniaDeOrganizador(organizador, puntuacion = 4) {
  const evento = crearEvento({ organizador });
  return crearResenia({ puntuacion, compraOverrides: { evento } });
}

describe("ResenaRepository", () => {
  let repositorio;

  beforeEach(() => {
    repositorio = new ResenaRepository();
  });

  it("save asigna un id a la reseña nueva y la devuelve", async () => {
    const resenia = crearResenia();

    const guardada = await repositorio.save(resenia);

    expect(guardada).toBe(resenia);
    expect(typeof guardada.id).toBe("string");
  });

  it("save conserva el id si la reseña ya lo tenía, sin duplicarla", async () => {
    const resenia = crearResenia();
    resenia.id = "resenia-fija";

    await repositorio.save(resenia);
    await repositorio.save(resenia);

    expect(resenia.id).toBe("resenia-fija");
    expect(repositorio.resenias.size).toBe(1);
  });

  it("findById devuelve la reseña guardada, o null si no existe", async () => {
    const resenia = await repositorio.save(crearResenia());

    expect(await repositorio.findById(resenia.id)).toBe(resenia);
    expect(await repositorio.findById("no-existe")).toBeNull();
  });

  describe("findByOrganizadorId", () => {
    it("devuelve solo las reseñas de los eventos de ese organizador", async () => {
      const olivia = crearOrganizador({ id: "olivia" });
      const octavio = crearOrganizador({ id: "octavio" });
      const deOlivia = await repositorio.save(reseniaDeOrganizador(olivia, 5));
      const otraDeOlivia = await repositorio.save(reseniaDeOrganizador(olivia, 3));
      await repositorio.save(reseniaDeOrganizador(octavio, 1));

      expect(await repositorio.findByOrganizadorId("olivia")).toEqual([deOlivia, otraDeOlivia]);
    });

    it("devuelve una lista vacía si el organizador no tiene reseñas", async () => {
      await repositorio.save(reseniaDeOrganizador(crearOrganizador({ id: "olivia" })));

      expect(await repositorio.findByOrganizadorId("otro")).toEqual([]);
    });
  });
});
