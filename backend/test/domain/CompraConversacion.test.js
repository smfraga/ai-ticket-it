import { describe, expect, it } from "@jest/globals";
import { ForbiddenError } from "../../errors/AppError.js";
import { crearComprador, crearCompra, crearEvento, crearOrganizador, enDias } from "../helpers/domainFactories.js";

const enHoras = (horas) => enDias(horas / 24);

// Compra de Carla en un evento de Olivia, con ids, para que esElMismo compare por id.
function compraConChat() {
  const olivia = crearOrganizador({ id: "olivia" });
  const carla = crearComprador({ id: "carla" });
  const compra = crearCompra({ evento: crearEvento({ organizador: olivia }), comprador: carla });
  return { compra, olivia, carla };
}

describe("Compra: último mensaje del chat", () => {
  it("sin mensajes no hay último mensaje", () => {
    expect(compraConChat().compra.ultimoMensaje()).toBeNull();
  });

  it("es el más reciente, sea de quien sea", () => {
    const { compra, olivia, carla } = compraConChat();
    compra.agregarMensaje(carla, "Hola", enHoras(1));
    compra.agregarMensaje(olivia, "¡Hola, Carla!", enHoras(2));

    expect(compra.ultimoMensaje().mensaje).toBe("¡Hola, Carla!");
  });

  it("se elige por la fecha de envío y no por el orden en que se guardó", () => {
    const { compra, olivia, carla } = compraConChat();
    compra.agregarMensaje(carla, "Escrito después", enHoras(5));
    compra.agregarMensaje(olivia, "Escrito antes", enHoras(3));

    expect(compra.ultimoMensaje().mensaje).toBe("Escrito después");
  });
});

describe("Compra: contraparte en el chat", () => {
  it("para el comprador, la contraparte es el organizador del evento", () => {
    const { compra, olivia, carla } = compraConChat();

    expect(compra.contraparteDe(carla)).toBe(olivia);
  });

  it("para el organizador, la contraparte es el comprador", () => {
    const { compra, olivia, carla } = compraConChat();

    expect(compra.contraparteDe(olivia)).toBe(carla);
  });

  it("un usuario ajeno a la compra no tiene contraparte (403)", () => {
    const { compra } = compraConChat();

    expect(() => compra.contraparteDe(crearComprador({ id: "camilo" }))).toThrow(ForbiddenError);
  });
});
