import { describe, expect, it } from "@jest/globals";
import { calcularPuntaje } from "../../domain/Puntaje.js";

const conPuntuaciones = (...puntuaciones) => puntuaciones.map((puntuacion) => ({ puntuacion }));

describe("calcularPuntaje", () => {
  it("devuelve null si no hay reseñas", () => {
    expect(calcularPuntaje([])).toBeNull();
  });

  it.each([
    [[5], 5],
    [[5, 4], 4.5],
    [[5, 4, 4], 4.3],
    [[3, 4, 4, 4], 3.8],
    [[1, 1, 2], 1.3],
  ])("con puntuaciones %j devuelve %d", (puntuaciones, esperado) => {
    expect(calcularPuntaje(conPuntuaciones(...puntuaciones))).toBe(esperado);
  });
});
