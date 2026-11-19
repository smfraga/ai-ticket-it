import { conToken, error, idPath, lista, ok, ref, sinCuerpo } from "./comun.js";

const eventoId = idPath("Id del evento");

export default {
  tags: [{ name: "Favoritos", description: "Eventos guardados por un comprador (las tres rutas exigen rol COMPRADOR)" }],
  paths: {
    "/eventos/{id}/favorito": {
      post: conToken({
        tags: ["Favoritos"],
        summary: "Guardar un evento como favorito",
        description: "Idempotente: 201 la primera vez y 200 si ya estaba guardado.",
        parameters: [eventoId],
        responses: {
          200: ok("Ya era favorito", ref("Evento")),
          201: ok("Guardado", ref("Evento")),
          400: error("BadRequest"),
          403: error("Forbidden"),
          404: error("NotFound"),
        },
      }),
      delete: conToken({
        tags: ["Favoritos"],
        summary: "Quitar un evento de los favoritos",
        description: "Idempotente: 204 haya estado guardado o no.",
        parameters: [eventoId],
        responses: {
          204: sinCuerpo("Quitado (sin cuerpo)"),
          400: error("BadRequest"),
          403: error("Forbidden"),
          404: error("NotFound"),
        },
      }),
    },
    "/favoritos": {
      get: conToken({
        tags: ["Favoritos"],
        summary: "Mis favoritos",
        description: "El último guardado primero, con el formato del catálogo (incluye eventos ya realizados o cancelados).",
        responses: { 200: ok("Los eventos guardados", lista("Evento")), 403: error("Forbidden") },
      }),
    },
  },
};
