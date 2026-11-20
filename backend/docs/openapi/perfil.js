import { body, conToken, error, fecha, idPath, ok, ref } from "./comun.js";

const foto = {
  type: "string",
  nullable: true,
  description: "Ruta de la foto de perfil con su versión (`/usuarios/{id}/foto?v=3`), o null si no tiene",
};

export default {
  tags: [{ name: "Perfil", description: "Los datos del usuario logueado (el del token) y las fotos de perfil" }],
  paths: {
    "/perfil/foto": {
      put: conToken({
        tags: ["Perfil"],
        summary: "Cambiar mi foto de perfil",
        description:
          "La foto como data URL de un JPEG o PNG en base64 (la app la achica a 256×256). El tipo se verifica por " +
          "los primeros bytes; hasta 64 KB de imagen. La respuesta trae la ruta nueva en `foto` (cambia la versión).",
        requestBody: body("FotoNueva"),
        responses: { 200: ok("El usuario con su foto", ref("Usuario")), 400: error("BadRequest") },
      }),
      delete: conToken({
        tags: ["Perfil"],
        summary: "Quitar mi foto de perfil",
        description: "Vuelven las iniciales. Sin foto no es un error.",
        responses: { 200: ok("El usuario sin foto", ref("Usuario")) },
      }),
    },
    "/usuarios/{id}/foto": {
      get: {
        tags: ["Perfil"],
        summary: "Foto de perfil de un usuario",
        description:
          "Pública (la ven los demás en el chat). Devuelve la imagen, no JSON, con caché de un día (la ruta lleva la versión).",
        parameters: [idPath("Id del usuario")],
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
    "/perfil": {
      get: conToken({
        tags: ["Perfil"],
        summary: "Mi perfil: datos, estadísticas e historial",
        description:
          "Según los roles: `comprador` y `organizador` traen sus estadísticas e historial, o `null` si no tiene ese " +
          "rol. Una entrada cuenta como comprada o vendida si la compra está `CONFIRMADA` o `UTILIZADA`. El historial " +
          "del comprador son los eventos a los que fue (compras `UTILIZADA`); el del organizador, sus eventos ya " +
          "realizados (sin los cancelados). Los dos, el más reciente primero.",
        responses: { 200: ok("El perfil", ref("Perfil")) },
      }),
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
    EventoResumen: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        nombre: { type: "string" },
        fecha,
        imagen: { type: "string", nullable: true },
        categoria: { type: "string" },
      },
    },
    Perfil: {
      type: "object",
      properties: {
        usuario: ref("Usuario"),
        comprador: {
          type: "object",
          nullable: true,
          properties: {
            estadisticas: {
              type: "object",
              properties: {
                entradasCompradas: { type: "integer" },
                totalGastado: { type: "number" },
                eventosALosQueFue: { type: "integer" },
                reseniasDejadas: { type: "integer" },
                categoriaPreferida: { type: "string", nullable: true, description: "La de más entradas compradas" },
                proximoEvento: { allOf: [ref("EventoResumen")], nullable: true },
              },
            },
            historial: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  evento: ref("EventoResumen"),
                  compras: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        cantidad: { type: "integer" },
                        total: { type: "number" },
                        tipoEntrada: { type: "object", properties: { nombre: { type: "string" } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        organizador: {
          type: "object",
          nullable: true,
          properties: {
            estadisticas: {
              type: "object",
              properties: {
                eventosCreados: {
                  type: "object",
                  properties: {
                    total: { type: "integer" },
                    proximos: { type: "integer" },
                    realizados: { type: "integer" },
                    cancelados: { type: "integer" },
                  },
                },
                entradasVendidas: { type: "integer" },
                recaudacion: { type: "number" },
                eventoMasVendido: {
                  type: "object",
                  nullable: true,
                  description:
                    "El de más entradas vendidas entre todos sus eventos (empate: el que más recaudó, después el más " +
                    "reciente); null si todavía no vendió ninguna",
                  properties: { evento: ref("EventoResumen"), entradasVendidas: { type: "integer" } },
                },
                puntaje: { type: "number", nullable: true },
                cantidadResenias: { type: "integer" },
              },
            },
            historial: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  evento: ref("EventoResumen"),
                  entradasVendidas: { type: "integer" },
                  recaudacion: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
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
        foto,
      },
    },
    FotoNueva: {
      type: "object",
      required: ["imagen"],
      additionalProperties: false,
      properties: {
        imagen: { type: "string", maxLength: 90000, example: "data:image/jpeg;base64,/9j/4AAQSkZJRg..." },
      },
    },
  },
};
