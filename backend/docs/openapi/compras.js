import { body, conToken, error, fecha, idPath, lista, ok, persona, ref } from "./comun.js";

const compraId = idPath("Id de la compra");
const eventoId = idPath("Id del evento");

// Las acciones sobre una compra responden lo mismo: la compra actualizada.
const accion = (summary, description) =>
  conToken({
    tags: ["Compras"],
    summary,
    description,
    parameters: [compraId],
    responses: {
      200: ok("La compra actualizada", ref("Compra")),
      400: error("BadRequest"),
      403: error("Forbidden"),
      404: error("NotFound"),
      409: error("Conflict"),
    },
  });

export default {
  tags: [
    { name: "Compras", description: "Comprar, seguir el estado y actuar sobre una compra" },
    { name: "Chat", description: "Mensajes entre el comprador y el organizador de una compra" },
  ],
  paths: {
    "/eventos/{id}/compras": {
      post: conToken({
        tags: ["Compras"],
        summary: "Comprar entradas",
        description:
          "Solo con rol COMPRADOR y nunca en un evento propio (403). La compra nace PENDIENTE y se confirma en el " +
          "mismo request (pago simulado). 409 si el evento ya pasó, está cancelado o no hay cupo.",
        parameters: [eventoId],
        requestBody: body("Comprar"),
        responses: {
          201: ok("La compra, CONFIRMADA", ref("Compra")),
          400: error("BadRequest"),
          403: error("Forbidden"),
          404: error("NotFound"),
          409: error("Conflict"),
        },
      }),
      get: conToken({
        tags: ["Compras"],
        summary: "Compras de un evento (organizador)",
        description: "Solo el organizador del evento. Incluye el cupo restante de cada tipo de entrada.",
        parameters: [eventoId],
        responses: {
          200: ok("El evento, sus tipos de entrada y sus compras", ref("ComprasDelEvento")),
          400: error("BadRequest"),
          403: error("Forbidden"),
          404: error("NotFound"),
        },
      }),
    },
    "/compras": {
      get: conToken({
        tags: ["Compras"],
        summary: "Mis compras",
        description: "Las del usuario del token, las más recientes primero.",
        responses: { 200: ok("Las compras", lista("Compra")) },
      }),
    },
    "/compras/{id}": {
      get: conToken({
        tags: ["Compras"],
        summary: "Detalle de una compra",
        description: "Solo el comprador y el organizador del evento. Ver el detalle no marca el chat como leído.",
        parameters: [compraId],
        responses: {
          200: ok("La compra con el comprador, el organizador y la reseña", ref("CompraDetalle")),
          400: error("BadRequest"),
          403: error("Forbidden"),
          404: error("NotFound"),
        },
      }),
    },
    "/compras/{id}/cancelar": {
      post: accion(
        "Cancelar una compra (comprador)",
        "Una PENDIENTE queda CANCELADA; una CONFIRMADA, REEMBOLSADA. 409 si está UTILIZADA, ya cancelada o el evento ya se realizó.",
      ),
    },
    "/compras/{id}/pagar": {
      post: accion(
        "Pagar una compra pendiente (comprador)",
        "Pago simulado: queda CONFIRMADA. 409 si no está PENDIENTE, si el evento ya se realizó o está cancelado, o si venció el plazo de pago.",
      ),
    },
    "/compras/{id}/utilizar": {
      post: accion(
        "Marcar una compra como utilizada (organizador)",
        "Solo el organizador del evento y solo desde CONFIRMADA. Después, el comprador puede reseñar.",
      ),
    },
    "/compras/{id}/mensajes": {
      get: conToken({
        tags: ["Chat"],
        summary: "Leer el chat",
        description:
          "Solo el comprador y el organizador. Del más viejo al más nuevo. Marca el chat como leído para quien lo pide.",
        parameters: [compraId],
        responses: {
          200: ok("Los mensajes", lista("Mensaje")),
          400: error("BadRequest"),
          403: error("Forbidden"),
          404: error("NotFound"),
        },
      }),
      post: conToken({
        tags: ["Chat"],
        summary: "Escribir en el chat",
        description: "Solo el comprador y el organizador, en cualquier estado de la compra. Escribir cuenta como leer.",
        parameters: [compraId],
        requestBody: body("MensajeNuevo"),
        responses: {
          201: ok("El mensaje enviado", ref("Mensaje")),
          400: error("BadRequest"),
          403: error("Forbidden"),
          404: error("NotFound"),
        },
      }),
    },
  },
  schemas: {
    Comprar: {
      type: "object",
      required: ["tipoEntradaId", "cantidad"],
      additionalProperties: false,
      properties: {
        tipoEntradaId: { type: "string", format: "uuid", example: "00000000-0000-4000-8000-400000000004" },
        cantidad: { type: "integer", minimum: 1, example: 2 },
      },
    },
    CambioEstadoCompra: {
      type: "object",
      properties: {
        estado: ref("EstadoCompra"),
        fechaHora: fecha,
        quien: {
          ...persona,
          description: 'Quién hizo el cambio. Si venció el plazo de pago, `{ id: "sistema", nombre: "AI Ticket It" }`',
        },
      },
    },
    Compra: {
      type: "object",
      properties: {
        id: { type: "string" },
        estado: ref("EstadoCompra"),
        cantidad: { type: "integer" },
        total: { type: "number" },
        diasRestantes: {
          type: "integer",
          nullable: true,
          description: "Solo CONFIRMADA de un evento próximo (0 = hoy)",
        },
        fechaLimiteDePago: {
          ...fecha,
          nullable: true,
          description: "Solo PENDIENTE: 7 días desde la compra o el inicio del evento, lo que llegue primero",
        },
        mensajesNoLeidos: {
          type: "integer",
          description: "Mensajes de la otra parte después de la última lectura de quien pide",
        },
        fecha: { ...fecha, description: "Cuándo se hizo la compra" },
        evento: {
          type: "object",
          properties: { id: { type: "string" }, nombre: { type: "string" }, fecha, cancelado: { type: "boolean" } },
        },
        tipoEntrada: {
          type: "object",
          properties: {
            id: { type: "string" },
            nombre: { type: "string" },
            precio: { type: "number" },
            cupoRestante: { type: "integer" },
          },
        },
        historial: lista("CambioEstadoCompra"),
      },
    },
    CompraDetalle: {
      allOf: [
        ref("Compra"),
        {
          type: "object",
          properties: {
            evento: {
              type: "object",
              properties: { yaPaso: { type: "boolean" }, organizador: persona },
              description: "Además de lo de `Compra`",
            },
            comprador: persona,
            resenia: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string" },
                puntuacion: { type: "integer" },
                detalle: { type: "string" },
                fecha,
              },
            },
          },
        },
      ],
    },
    ComprasDelEvento: {
      type: "object",
      properties: {
        evento: {
          type: "object",
          properties: {
            id: { type: "string" },
            nombre: { type: "string" },
            fecha,
            yaPaso: { type: "boolean" },
            cancelado: { type: "boolean" },
          },
        },
        tiposEntrada: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              nombre: { type: "string" },
              cupo: { type: "integer" },
              cupoRestante: { type: "integer" },
            },
          },
        },
        compras: {
          type: "array",
          items: { allOf: [ref("Compra"), { type: "object", properties: { comprador: persona } }] },
        },
      },
    },
    MensajeNuevo: {
      type: "object",
      required: ["mensaje"],
      additionalProperties: false,
      properties: {
        mensaje: { type: "string", minLength: 1, maxLength: 500, example: "¿A qué hora abren las puertas?" },
      },
    },
    Mensaje: {
      type: "object",
      properties: {
        autor: {
          type: "object",
          properties: {
            ...persona.properties,
            rol: { type: "string", enum: ["COMPRADOR", "ORGANIZADOR"], description: "Su rol en esta compra" },
            foto: { type: "string", nullable: true, description: "Ruta de su foto de perfil, o null" },
          },
        },
        mensaje: { type: "string" },
        enviado: fecha,
      },
    },
  },
};
