// Piezas que comparten todos los módulos de la especificación OpenAPI.

export const ref = (nombre) => ({ $ref: `#/components/schemas/${nombre}` });
export const json = (schema) => ({ "application/json": { schema } });
export const ok = (description, schema) => ({ description, content: json(schema) });
export const lista = (nombre) => ({ type: "array", items: ref(nombre) });
export const error = (nombre) => ({ $ref: `#/components/responses/${nombre}` });
export const body = (nombre) => ({ required: true, content: json(ref(nombre)) });
export const sinCuerpo = (description) => ({ description });

export const idPath = (description) => ({
  name: "id",
  in: "path",
  required: true,
  description,
  schema: { type: "string", format: "uuid", example: "00000000-0000-4000-8000-300000000002" },
});

// Paginación de los listados, como en el TP grupal: los parámetros `page` y `limit` y la respuesta paginada.
export const page = { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } };
export const limit = { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } };

export const paginado = (clave, item) => ({
  type: "object",
  properties: {
    [clave]: { type: "array", items: ref(item) },
    total: { type: "integer", example: 37, description: "Cuántos cumplen los filtros, en todas las páginas" },
    page: { type: "integer", example: 1 },
    totalPages: { type: "integer", example: 2 },
  },
});

// Una operación que exige token: suma el esquema Bearer y la respuesta 401.
export const conToken = (operacion) => ({
  ...operacion,
  security: [{ bearerAuth: [] }],
  responses: { ...operacion.responses, 401: error("Unauthorized") },
});

const fecha = { type: "string", format: "date-time" };
export const persona = {
  type: "object",
  properties: { id: { type: "string" }, nombre: { type: "string" }, apellido: { type: "string" } },
};

// Una persona con la ruta de su foto de perfil (`/usuarios/{id}/foto?v=N`), o null si no tiene.
export const personaConFoto = {
  type: "object",
  properties: {
    ...persona.properties,
    foto: { type: "string", nullable: true, description: "Ruta de su foto de perfil, o null" },
  },
};

export const schemasComunes = {
  Error: {
    type: "object",
    properties: {
      status: { type: "string", example: "fail", description: "`fail` para errores 4xx, `error` para 5xx" },
      message: { type: "string", example: "El evento no existe" },
      details: {
        description: "Solo en los 400 de validación: los problemas que encontró Zod (cada uno con `path` y `message`)",
        type: "array",
        items: { type: "object" },
      },
      timestamp: fecha,
    },
  },
  EstadoCompra: {
    type: "string",
    enum: ["PENDIENTE", "CONFIRMADA", "UTILIZADA", "CANCELADA", "REEMBOLSADA"],
  },
};

export const respuestasComunes = {
  BadRequest: {
    description: "Body, query o id con formato inválido (el id tiene que ser un UUID)",
    content: json(ref("Error")),
  },
  Unauthorized: {
    description: "Falta el token, es inválido o expiró, o su usuario ya no existe (los datos viven en memoria)",
    content: json(ref("Error")),
  },
  Forbidden: {
    description: "Logueado, pero sin el rol necesario o sin permiso sobre ese recurso",
    content: json(ref("Error")),
  },
  NotFound: { description: "El recurso no existe", content: json(ref("Error")) },
  Conflict: {
    description: "Se viola una regla del negocio (por ejemplo, sin cupo o un estado que no lo permite)",
    content: json(ref("Error")),
  },
  TooManyRequests: {
    description: "Demasiados logins fallidos desde la misma IP. `Retry-After` dice en cuántos segundos reintentar",
    headers: { "Retry-After": { schema: { type: "integer" }, description: "Segundos que faltan para reintentar" } },
    content: json(ref("Error")),
  },
};

export const seguridad = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "El `token` que devuelven `POST /auth/login` y `POST /auth/registro`. Dura 1 hora",
  },
};

export { fecha };
