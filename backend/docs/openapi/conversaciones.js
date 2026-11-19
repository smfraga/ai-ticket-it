import { conToken, fecha, ok, persona, ref } from "./comun.js";

export default {
  tags: [{ name: "Mensajes", description: "La lista de chats del usuario, para la pestaña Mensajes de la app" }],
  paths: {
    "/conversaciones": {
      get: conToken({
        tags: ["Mensajes"],
        summary: "Mis conversaciones",
        description:
          "Un chat por compra, como comprador o como organizador del evento. Solo las compras con al menos un " +
          "mensaje, la del último mensaje más reciente primero. `totalNoLeidos` suma los mensajes nuevos de todas " +
          "(el número de la pestaña). Ver la lista no marca nada como leído: eso pasa al abrir el chat " +
          "(`GET /compras/{id}/mensajes`).",
        responses: { 200: ok("Las conversaciones", ref("Conversaciones")) },
      }),
    },
  },
  schemas: {
    Conversacion: {
      type: "object",
      properties: {
        compraId: { type: "string", format: "uuid", description: "Para abrir el chat con `/compras/{id}/mensajes`" },
        evento: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            nombre: { type: "string" },
            imagen: { type: "string", nullable: true, description: "La primera imagen del evento, o null" },
            fecha,
            cancelado: { type: "boolean" },
          },
        },
        tipoEntrada: { type: "object", properties: { nombre: { type: "string" } } },
        cantidad: { type: "integer" },
        contraparte: {
          type: "object",
          description: "Con quién se habla: el organizador para el comprador, y el comprador para el organizador",
          properties: {
            ...persona.properties,
            rol: { type: "string", enum: ["COMPRADOR", "ORGANIZADOR"], description: "Su rol en esta compra" },
          },
        },
        ultimoMensaje: {
          type: "object",
          properties: {
            texto: { type: "string" },
            enviado: fecha,
            propio: { type: "boolean", description: "Si lo escribió quien pide" },
          },
        },
        noLeidos: { type: "integer", description: "Mensajes de la otra parte que todavía no leyó" },
      },
    },
    Conversaciones: {
      type: "object",
      properties: {
        totalNoLeidos: { type: "integer", example: 1 },
        conversaciones: { type: "array", items: ref("Conversacion") },
      },
    },
  },
};
