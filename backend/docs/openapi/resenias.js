import { body, conToken, error, fecha, idPath, lista, ok, personaConFoto, ref } from "./comun.js";

const organizadorConPuntaje = {
  type: "object",
  properties: {
    ...personaConFoto.properties,
    puntaje: {
      type: "number",
      nullable: true,
      example: 4.5,
      description: "Promedio de las reseñas de todos sus eventos",
    },
  },
};

export default {
  tags: [{ name: "Reseñas", description: "Puntuar una compra utilizada y ver la reputación de los organizadores" }],
  paths: {
    "/compras/{id}/resenia": {
      post: conToken({
        tags: ["Reseñas"],
        summary: "Reseñar una compra",
        description: "Solo el comprador, solo una compra UTILIZADA y una sola vez por compra (409).",
        parameters: [idPath("Id de la compra")],
        requestBody: body("ReseniaNueva"),
        responses: {
          201: ok("La reseña", ref("Resenia")),
          400: error("BadRequest"),
          403: error("Forbidden"),
          404: error("NotFound"),
          409: error("Conflict"),
        },
      }),
    },
    "/eventos/{id}/resenias": {
      get: {
        tags: ["Reseñas"],
        summary: "Reseñas de un evento",
        description: "Público. Las más recientes primero, con el organizador y su puntaje.",
        parameters: [idPath("Id del evento")],
        responses: {
          200: ok("Las reseñas del evento", {
            type: "object",
            properties: {
              evento: { type: "object", properties: { id: { type: "string" }, nombre: { type: "string" } } },
              organizador: organizadorConPuntaje,
              resenias: lista("Resenia"),
            },
          }),
          400: error("BadRequest"),
          404: error("NotFound"),
        },
      },
    },
    "/organizadores/{id}/resenias": {
      get: {
        tags: ["Reseñas"],
        summary: "Reseñas de un organizador",
        description:
          "Público. Todas las de sus eventos, para mostrar la reputación antes de comprar. 404 si no es organizador.",
        parameters: [idPath("Id del usuario organizador")],
        responses: {
          200: ok("El organizador con su puntaje y sus reseñas", {
            type: "object",
            properties: {
              organizador: {
                type: "object",
                properties: { ...organizadorConPuntaje.properties, cantidadResenias: { type: "integer" } },
              },
              resenias: lista("Resenia"),
            },
          }),
          400: error("BadRequest"),
          404: error("NotFound"),
        },
      },
    },
  },
  schemas: {
    ReseniaNueva: {
      type: "object",
      required: ["puntuacion", "detalle"],
      additionalProperties: false,
      properties: {
        puntuacion: { type: "integer", minimum: 1, maximum: 5, example: 5 },
        detalle: { type: "string", minLength: 1, description: "Sin límite de largo", example: "Un show increíble" },
      },
    },
    Resenia: {
      type: "object",
      properties: {
        id: { type: "string" },
        puntuacion: { type: "integer" },
        detalle: { type: "string" },
        fecha,
        autor: personaConFoto,
        evento: { type: "object", properties: { id: { type: "string" }, nombre: { type: "string" } } },
      },
    },
  },
};
