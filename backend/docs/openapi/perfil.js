import { body, conToken, error, ok, ref } from "./comun.js";

export default {
  tags: [{ name: "Perfil", description: "Los datos del usuario logueado (el del token)" }],
  paths: {
    "/perfil": {
      patch: conToken({
        tags: ["Perfil"],
        summary: "Editar mi nombre y apellido",
        description:
          "Cambia solo lo que viene (al menos uno de los dos), sin los espacios de los bordes. El email y los roles " +
          "no se editan. El token sigue sirviendo: solo lleva el id y los roles.",
        requestBody: body("EdicionPerfil"),
        responses: { 200: ok("El usuario actualizado", ref("Usuario")), 400: error("BadRequest") },
      }),
    },
  },
  schemas: {
    EdicionPerfil: {
      type: "object",
      additionalProperties: false,
      minProperties: 1,
      properties: {
        nombre: { type: "string", minLength: 1, maxLength: 60, example: "Carla María" },
        apellido: { type: "string", minLength: 1, maxLength: 60, example: "Gómez" },
      },
    },
    Usuario: {
      type: "object",
      properties: {
        id: { type: "string" },
        nombre: { type: "string" },
        apellido: { type: "string" },
        email: { type: "string" },
        roles: { type: "array", items: ref("Rol") },
      },
    },
  },
};
