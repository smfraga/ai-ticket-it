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
