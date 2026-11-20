import { describe, expect, it } from "@jest/globals";
import { z } from "zod";
import { registroValidation } from "../../validations/authValidation.js";
import {
  crearEventoValidation,
  filtrosEventosValidation,
  imagenEventoValidation,
} from "../../validations/eventoValidation.js";
import { mensajesDeTipo } from "../../validations/mensajesDeTipo.js";
import { paginacionValidation } from "../../validations/paginacionValidation.js";
import { fotoValidation } from "../../validations/perfilValidation.js";

const primerMensaje = (resultado) => resultado.error.issues[0].message;

describe("mensajesDeTipo (zod 4)", () => {
  const numero = z
    .number(mensajesDeTipo({ obligatorio: "Falta", tipoInvalido: "No es un número" }))
    .min(1, "Muy chico");
  const conObjeto = (valor) => z.object({ n: numero }).safeParse(valor);

  it("sin el valor da el mensaje de obligatorio", () => {
    expect(primerMensaje(conObjeto({}))).toBe("Falta");
  });

  it("con otro tipo da el de tipo inválido", () => {
    expect(primerMensaje(conObjeto({ n: "3" }))).toBe("No es un número");
  });

  it("los demás problemas siguen con su propio mensaje", () => {
    expect(primerMensaje(conObjeto({ n: 0 }))).toBe("Muy chico");
  });

  it("una regla sin mensaje propio no toma el de tipo inválido (sigue el de zod)", () => {
    const sinMensajes = z.number(mensajesDeTipo({ tipoInvalido: "No es un número" }));
    // En zod 4, un decimal en `.int()` también es un error de tipo (esperado "int"), pero sí es un número.
    expect(primerMensaje(sinMensajes.int().safeParse(1.5))).not.toBe("No es un número");
    expect(primerMensaje(sinMensajes.min(5).safeParse(1))).not.toBe("No es un número");
    expect(primerMensaje(sinMensajes.safeParse("tres"))).toBe("No es un número");
  });

  it("sin mensaje para un caso, usa el de zod", () => {
    const soloTipo = z.object({ n: z.number(mensajesDeTipo({ tipoInvalido: "No es un número" })) });
    const resultado = soloTipo.safeParse({});
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).not.toBe("No es un número");
  });
});

// Mensajes propios que ningún otro test miraba: con el cambio de zod 3 a 4 podían perderse sin que nada fallara.
describe("mensajes propios después del cambio a zod 4", () => {
  it("paginación: page en texto", () => {
    expect(primerMensaje(paginacionValidation.safeParse({ page: "abc" }))).toBe("page debe ser un número");
  });

  it("catálogo: un orden que no existe y un precio en texto", () => {
    expect(primerMensaje(filtrosEventosValidation.safeParse({ orden: "nombre" }))).toBe(
      "Tiene que ser fecha, precio, puntaje",
    );
    expect(primerMensaje(filtrosEventosValidation.safeParse({ precioMin: "barato" }))).toBe("Debe ser un número");
  });

  it("crear evento: precio y cupo en texto", () => {
    const evento = (tipo) => ({
      nombre: "Recital",
      categoriaId: "3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a13",
      fecha: "2026-12-20T21:00:00Z",
      tiposEntrada: [{ nombre: "General", precio: 1000, cupo: 10, ...tipo }],
    });
    expect(primerMensaje(crearEventoValidation.safeParse(evento({ precio: "mil" })))).toBe(
      "El precio debe ser un número",
    );
    expect(primerMensaje(crearEventoValidation.safeParse(evento({ cupo: "diez" })))).toBe("El cupo debe ser un número");
  });

  it("registro: sin roles, y con un rol que no existe", () => {
    const datos = { nombre: "Ana", apellido: "Pérez", email: "ana@mail.com", password: "12345678" };
    expect(primerMensaje(registroValidation.safeParse(datos))).toBe("Los roles son obligatorios");
    expect(primerMensaje(registroValidation.safeParse({ ...datos, roles: ["ADMIN"] }))).toBe(
      "El rol del usuario debe ser COMPRADOR u ORGANIZADOR",
    );
    expect(registroValidation.safeParse({ ...datos, roles: ["COMPRADOR", "ORGANIZADOR"] }).success).toBe(true);
  });

  it("imagen del evento y foto de perfil sin imagen", () => {
    expect(primerMensaje(imagenEventoValidation.safeParse({}))).toBe("Falta la imagen");
    expect(primerMensaje(fotoValidation.safeParse({}))).toBe("Falta la imagen");
  });
});
