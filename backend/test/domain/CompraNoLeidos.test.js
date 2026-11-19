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

describe("Compra: mensajes no leídos", () => {
  it("sin mensajes, nadie tiene nuevos", () => {
    const { compra, olivia, carla } = compraConChat();

    expect(compra.mensajesNoLeidosPara(carla)).toBe(0);
    expect(compra.mensajesNoLeidosPara(olivia)).toBe(0);
  });

  it("si nunca leyó el chat, todos los de la otra parte son nuevos; los propios nunca cuentan", () => {
    const { compra, olivia, carla } = compraConChat();
    compra.agregarMensaje(carla, "Hola", enHoras(1));
    compra.agregarMensaje(carla, "¿Hay estacionamiento?", enHoras(2));

    expect(compra.mensajesNoLeidosPara(olivia)).toBe(2);
    expect(compra.mensajesNoLeidosPara(carla)).toBe(0);
  });

  it("después de leer, solo cuentan los que llegaron más tarde", () => {
    const { compra, olivia, carla } = compraConChat();
    compra.agregarMensaje(carla, "Hola", enHoras(1));
    compra.marcarLeido(olivia, enHoras(2));
    compra.agregarMensaje(carla, "¿Me respondés?", enHoras(3));

    expect(compra.mensajesNoLeidosPara(olivia)).toBe(1);
  });

  it("un mensaje enviado justo en el momento de la lectura ya se considera leído", () => {
    const { compra, olivia, carla } = compraConChat();
    compra.agregarMensaje(carla, "Hola", enHoras(1));
    compra.marcarLeido(olivia, enHoras(1));

    expect(compra.mensajesNoLeidosPara(olivia)).toBe(0);
  });

  it("escribir cuenta como leer: al responder, lo anterior de la otra parte deja de ser nuevo", () => {
    const { compra, olivia, carla } = compraConChat();
    compra.agregarMensaje(carla, "Hola", enHoras(1));
    compra.agregarMensaje(olivia, "¡Hola, Carla!", enHoras(2));

    expect(compra.mensajesNoLeidosPara(olivia)).toBe(0);
    expect(compra.mensajesNoLeidosPara(carla)).toBe(1);
    expect(compra.lecturas.get("olivia")).toEqual(enHoras(2));
  });

  it("cada participante tiene su propia lectura", () => {
    const { compra, olivia, carla } = compraConChat();
    compra.agregarMensaje(carla, "Hola", enHoras(1));
    compra.agregarMensaje(olivia, "Hola", enHoras(2));
    compra.marcarLeido(carla, enHoras(3));

    expect(compra.mensajesNoLeidosPara(carla)).toBe(0);
    expect(compra.mensajesNoLeidosPara(olivia)).toBe(0);
    compra.agregarMensaje(carla, "Gracias", enHoras(4));
    expect(compra.mensajesNoLeidosPara(olivia)).toBe(1);
    expect(compra.mensajesNoLeidosPara(carla)).toBe(0);
  });

  it("solo los participantes marcan el chat como leído (403), y un ajeno no tiene mensajes nuevos", () => {
    const { compra, carla } = compraConChat();
    const ajeno = crearComprador({ id: "camilo" });
    compra.agregarMensaje(carla, "Hola", enHoras(1));

    expect(() => compra.marcarLeido(ajeno, enHoras(2))).toThrow(
      new ForbiddenError("Solo el comprador y el organizador del evento pueden ver este chat"),
    );
    expect(compra.lecturas.has("camilo")).toBe(false);
    expect(compra.mensajesNoLeidosPara(ajeno)).toBe(0);
    expect(compra.mensajesNoLeidosPara(undefined)).toBe(0);
  });
});
