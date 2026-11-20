import { describe, expect, it } from "@jest/globals";
import { ValidationError } from "../../errors/AppError.js";
import { crearComprador } from "../helpers/domainFactories.js";

describe("Usuario.cambiarNombre (editar el perfil)", () => {
  it("cambia nombre y apellido, sin los espacios de los bordes", () => {
    const carla = crearComprador({ nombre: "Carla", apellido: "Gómez" });

    carla.cambiarNombre({ nombre: "  Carla María ", apellido: " Gómez Paz  " });

    expect(carla.nombre).toBe("Carla María");
    expect(carla.apellido).toBe("Gómez Paz");
  });

  it("cambia solo lo que viene", () => {
    const carla = crearComprador({ nombre: "Carla", apellido: "Gómez" });

    carla.cambiarNombre({ apellido: "Paz" });

    expect(carla.nombre).toBe("Carla");
    expect(carla.apellido).toBe("Paz");
  });

  it.each([
    ["un nombre vacío", { nombre: "   " }, "El usuario debe tener un nombre"],
    ["un apellido vacío", { apellido: "" }, "El usuario debe tener un apellido"],
    ["un nombre que no es texto", { nombre: 42 }, "El usuario debe tener un nombre"],
    ["nada para cambiar", {}, "Hay que indicar el nombre o el apellido a cambiar"],
  ])("rechaza %s (400)", (_, datos, mensaje) => {
    const carla = crearComprador({ nombre: "Carla", apellido: "Gómez" });

    expect(() => carla.cambiarNombre(datos)).toThrow(ValidationError);
    expect(() => carla.cambiarNombre(datos)).toThrow(mensaje);
  });

  it("si el apellido es inválido, el nombre tampoco cambia", () => {
    const carla = crearComprador({ nombre: "Carla", apellido: "Gómez" });

    expect(() => carla.cambiarNombre({ nombre: "Carlita", apellido: " " })).toThrow(ValidationError);
    expect(carla.nombre).toBe("Carla");
    expect(carla.apellido).toBe("Gómez");
  });

  it("no toca el email ni los roles", () => {
    const carla = crearComprador({ email: "carla@example.com" });

    carla.cambiarNombre({ nombre: "Otra" });

    expect(carla.email).toBe("carla@example.com");
    expect(carla.roles).toEqual(["COMPRADOR"]);
  });
});
