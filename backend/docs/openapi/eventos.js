import { body, conToken, error, fecha, idPath, limit, lista, ok, page, paginado, ref } from "./comun.js";

const eventoId = idPath("Id del evento");
const query = (name, schema, description) => ({ name, in: "query", required: false, schema, description });

const tipoEntradaDatos = {
  nombre: { type: "string", example: "General" },
  descripcion: { type: "string", example: "Campo, de pie" },
  precio: { type: "number", minimum: 0, example: 12000 },
  cupo: { type: "integer", minimum: 1, example: 300 },
};

export default {
  tags: [
    { name: "Eventos", description: "Catálogo (público) y gestión de eventos por su organizador" },
    { name: "Categorías", description: "Para explorar el catálogo" },
  ],
  paths: {
    "/eventos": {
      get: {
        tags: ["Eventos"],
        summary: "Buscar eventos",
        description:
          "Público. Por defecto, solo los próximos y ordenados por fecha. Los cancelados no aparecen, salvo al " +
          'filtrar por `organizadorId` ("Mis eventos"). Paginado con `page` y `limit` (de a 20 por defecto; la app pide de a 10). ' +
          "Un parámetro desconocido responde 400.",
        parameters: [
          query(
            "texto",
            { type: "string", maxLength: 100 },
            "En nombre y descripción, sin mayúsculas ni tildes; todas las palabras",
          ),
          query("categoriaId", { type: "string", format: "uuid" }, "Solo esa categoría"),
          query(
            "organizadorId",
            { type: "string", format: "uuid" },
            "Solo los eventos de ese organizador (incluye cancelados)",
          ),
          query(
            "precioMin",
            { type: "number", minimum: 0 },
            "Con alguna entrada desde este precio (`tuPrecioEstaEntre`)",
          ),
          query("precioMax", { type: "number", minimum: 0 }, "Con alguna entrada hasta este precio"),
          query("periodo", { type: "string", enum: ["proximos", "pasados", "todos"], default: "proximos" }),
          query(
            "orden",
            { type: "string", enum: ["fecha", "precio", "puntaje"], default: "fecha" },
            "`precio`: la entrada más barata; `puntaje`: el del organizador",
          ),
          query(
            "direccion",
            { type: "string", enum: ["asc", "desc"] },
            "Por defecto `asc`, salvo `puntaje` (`desc`). Sin puntaje, siempre al final",
          ),
          page,
          limit,
        ],
        responses: {
          200: ok("Una página de los eventos que cumplen los filtros", paginado("eventos", "Evento")),
          400: error("BadRequest"),
        },
      },
      post: conToken({
        tags: ["Eventos"],
        summary: "Crear un evento",
        description:
          "Solo con rol ORGANIZADOR. La fecha tiene que ser futura y los tipos de entrada, de nombres distintos.",
        requestBody: body("EventoNuevo"),
        responses: {
          201: ok("Evento creado, con los ids de sus tipos de entrada", ref("Evento")),
          400: error("BadRequest"),
          403: error("Forbidden"),
          404: error("NotFound"),
        },
      }),
    },
    "/eventos/{id}": {
      get: {
        tags: ["Eventos"],
        summary: "Detalle de un evento",
        description: "Público. También de eventos ya realizados o cancelados.",
        parameters: [eventoId],
        responses: { 200: ok("El evento", ref("Evento")), 400: error("BadRequest"), 404: error("NotFound") },
      },
      patch: conToken({
        tags: ["Eventos"],
        summary: "Editar un evento",
        description:
          "Solo su organizador y solo un evento próximo y no cancelado (409). Cambia solo lo que viene. " +
          "`tiposEntrada`, si viene, es la lista completa: con `id` se editan, sin `id` se crean y los que faltan se " +
          "quitan. Un tipo con entradas vendidas no se quita ni cambia de precio, y su cupo no baja de lo vendido (409). " +
          "Si cambia la fecha, cada compra pendiente o confirmada recibe un aviso en su chat.",
        parameters: [eventoId],
        requestBody: body("EventoEdicion"),
        responses: {
          200: ok("El evento editado", ref("Evento")),
          400: error("BadRequest"),
          403: error("Forbidden"),
          404: error("NotFound"),
          409: error("Conflict"),
        },
      }),
    },
    "/eventos/{id}/cancelar": {
      post: conToken({
        tags: ["Eventos"],
        summary: "Cancelar un evento",
        description:
          "Solo su organizador, en un evento próximo (409 si ya pasó o ya estaba cancelado). Las compras confirmadas " +
          "quedan REEMBOLSADA y las pendientes CANCELADA, con un aviso en su chat. El evento sale del catálogo.",
        parameters: [eventoId],
        responses: {
          200: ok("El evento, con `cancelado: true`", ref("Evento")),
          400: error("BadRequest"),
          403: error("Forbidden"),
          404: error("NotFound"),
          409: error("Conflict"),
        },
      }),
    },
    "/eventos/{id}/imagenes": {
      post: conToken({
        tags: ["Eventos"],
        summary: "Adjuntar una imagen al evento",
        description:
          "Solo su organizador, en un evento próximo y no cancelado (409). La imagen va como data URL de un JPEG o " +
          "PNG en base64 (la app la achica a 1080 px de lado); el tipo se verifica por los primeros bytes y puede " +
          "pesar hasta 400 KB (este pedido acepta un cuerpo de hasta 600 KB; el resto de la API, 100 KB). " +
          "Su ruta se suma al final de `multimedia`. Hasta 6 imágenes por evento, contando las URLs (409).",
        parameters: [eventoId],
        requestBody: body("ImagenNueva"),
        responses: {
          201: ok("El evento, con la ruta de la imagen nueva al final de `multimedia`", ref("Evento")),
          400: error("BadRequest"),
          403: error("Forbidden"),
          404: error("NotFound"),
          409: error("Conflict"),
          413: { description: "El cuerpo supera los 600 KB" },
        },
      }),
    },
    "/eventos/{id}/imagenes/{imagenId}": {
      get: {
        tags: ["Eventos"],
        summary: "Imagen adjunta de un evento",
        description:
          "Pública, como el detalle. Devuelve la imagen, no JSON. Cada imagen tiene su id y no cambia nunca, así que " +
          "tiene caché de un año. Se pierde si el servidor se reinicia (los datos viven en memoria).",
        parameters: [eventoId, { ...idPath("Id de la imagen"), name: "imagenId" }],
        responses: {
          200: {
            description: "La imagen",
            content: {
              "image/jpeg": { schema: { type: "string", format: "binary" } },
              "image/png": { schema: { type: "string", format: "binary" } },
            },
          },
          400: error("BadRequest"),
          404: error("NotFound"),
        },
      },
    },
    "/categorias": {
      get: {
        tags: ["Categorías"],
        summary: "Listar categorías",
        description: "Público, ordenadas por nombre.",
        responses: { 200: ok("Las categorías", lista("Categoria")) },
      },
    },
  },
  schemas: {
    Categoria: {
      type: "object",
      properties: {
        id: { type: "string" },
        nombre: { type: "string", example: "Recitales" },
        descripcion: { type: "string" },
      },
    },
    TipoEntrada: {
      type: "object",
      properties: { id: { type: "string" }, ...tipoEntradaDatos, disponibles: { type: "integer", example: 296 } },
    },
    Evento: {
      type: "object",
      properties: {
        id: { type: "string" },
        nombre: { type: "string", example: "Rock en el Río de la Plata" },
        descripcion: { type: "string" },
        categoria: { type: "object", properties: { id: { type: "string" }, nombre: { type: "string" } } },
        fecha,
        multimedia: {
          type: "array",
          maxItems: 6,
          items: { type: "string" },
          description:
            "URLs y rutas de imágenes adjuntas (`/eventos/{id}/imagenes/{imagenId}`, relativas al servidor), en orden",
        },
        organizador: {
          type: "object",
          properties: {
            id: { type: "string" },
            nombre: { type: "string" },
            apellido: { type: "string" },
            foto: { type: "string", nullable: true, description: "Ruta de su foto de perfil, o null" },
            puntaje: {
              type: "number",
              nullable: true,
              example: 4.5,
              description: "Promedio de sus reseñas; null sin reseñas",
            },
          },
        },
        precioDesde: { type: "number", example: 12000 },
        yaPaso: { type: "boolean" },
        diasParaElEvento: {
          type: "integer",
          nullable: true,
          example: 5,
          description: "Días de calendario hasta el evento (0 = hoy); null si ya se realizó",
        },
        cancelado: { type: "boolean" },
        tiposEntrada: lista("TipoEntrada"),
      },
    },
    TipoEntradaNuevo: {
      type: "object",
      required: ["nombre", "precio", "cupo"],
      additionalProperties: false,
      properties: tipoEntradaDatos,
    },
    EventoNuevo: {
      type: "object",
      required: ["nombre", "categoriaId", "fecha", "tiposEntrada"],
      additionalProperties: false,
      properties: {
        nombre: { type: "string", example: "Recital de rock" },
        descripcion: { type: "string" },
        categoriaId: { type: "string", format: "uuid", example: "00000000-0000-4000-8000-200000000001" },
        fecha: { ...fecha, example: "2026-12-20T21:00:00-03:00" },
        tiposEntrada: { type: "array", minItems: 1, items: ref("TipoEntradaNuevo") },
        multimedia: { type: "array", maxItems: 6, items: { type: "string", format: "uri" } },
      },
    },
    ImagenNueva: {
      type: "object",
      required: ["imagen"],
      additionalProperties: false,
      properties: {
        imagen: { type: "string", maxLength: 560000, example: "data:image/jpeg;base64,/9j/4AAQSkZJRg..." },
      },
    },
    EventoEdicion: {
      type: "object",
      minProperties: 1,
      additionalProperties: false,
      description: "Todo opcional, pero al menos un campo",
      properties: {
        nombre: { type: "string" },
        descripcion: { type: "string" },
        categoriaId: { type: "string", format: "uuid" },
        fecha,
        multimedia: {
          type: "array",
          maxItems: 6,
          items: { type: "string" },
          description:
            "La lista completa de lo que queda: URLs o rutas de imágenes adjuntas de este evento. Los bytes de las " +
            "adjuntas que no estén se descartan",
        },
        tiposEntrada: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["nombre", "precio", "cupo"],
            additionalProperties: false,
            properties: {
              id: { type: "string", format: "uuid", description: "Solo los que ya existían" },
              ...tipoEntradaDatos,
            },
          },
        },
      },
    },
  },
};
