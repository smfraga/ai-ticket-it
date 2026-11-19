import { body, error, ok, ref } from "./comun.js";

export default {
  tags: [
    { name: "Salud", description: "Para comprobar que el servidor responde" },
    { name: "Autenticación", description: "Registro e inicio de sesión con JWT" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Salud"],
        summary: "El servidor está vivo",
        responses: {
          200: ok("Responde siempre lo mismo", {
            type: "object",
            properties: { status: { type: "string", example: "ok" } },
          }),
        },
      },
    },
    "/auth/registro": {
      post: {
        tags: ["Autenticación"],
        summary: "Crear una cuenta",
        description: "Crea el usuario con los roles elegidos y devuelve la sesión, como el login.",
        requestBody: body("Registro"),
        responses: {
          201: ok("Usuario creado, con su token", ref("Sesion")),
          400: error("BadRequest"),
          409: error("Conflict"),
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Autenticación"],
        summary: "Iniciar sesión",
        description:
          "Los usuarios del seed tienen la contraseña `Demo1234!`: `carla@example.com` y `camilo@example.com` " +
          "(compradores), `olivia@example.com` y `octavio@example.com` (organizadores). Después de 10 logins " +
          "fallidos desde la misma IP en 15 minutos responde 429.",
        requestBody: body("Login"),
        responses: {
          200: ok("Sesión iniciada", ref("Sesion")),
          400: error("BadRequest"),
          401: error("Unauthorized"),
          429: error("TooManyRequests"),
        },
      },
    },
  },
  schemas: {
    Rol: { type: "string", enum: ["COMPRADOR", "ORGANIZADOR"] },
    Registro: {
      type: "object",
      required: ["nombre", "apellido", "email", "password", "roles"],
      additionalProperties: false,
      properties: {
        nombre: { type: "string", example: "Ana" },
        apellido: { type: "string", example: "Pérez" },
        email: { type: "string", format: "email", example: "ana@example.com" },
        password: { type: "string", minLength: 8, description: "Hasta 72 bytes", example: "una-clave-larga" },
        roles: { type: "array", minItems: 1, uniqueItems: true, items: ref("Rol"), example: ["COMPRADOR"] },
      },
    },
    Login: {
      type: "object",
      required: ["email", "password"],
      additionalProperties: false,
      properties: {
        email: { type: "string", example: "carla@example.com" },
        password: { type: "string", example: "Demo1234!" },
      },
    },
    Sesion: {
      type: "object",
      properties: {
        token: { type: "string", description: "JWT para el header `Authorization: Bearer <token>`" },
        usuario: {
          type: "object",
          properties: {
            id: { type: "string" },
            nombre: { type: "string" },
            apellido: { type: "string" },
            email: { type: "string" },
            roles: { type: "array", items: ref("Rol") },
            foto: { type: "string", nullable: true, description: "Ruta de su foto de perfil, o null" },
          },
        },
      },
    },
  },
};
