import { respuestasComunes, schemasComunes, seguridad } from "./comun.js";
import auth from "./auth.js";
import compras from "./compras.js";
import conversaciones from "./conversaciones.js";
import eventos from "./eventos.js";
import favoritos from "./favoritos.js";
import perfil from "./perfil.js";
import resenias from "./resenias.js";

// Cada módulo trae sus `tags`, `paths` y `schemas`; acá se unen en una sola especificación OpenAPI.
const modulos = [auth, eventos, compras, conversaciones, resenias, favoritos, perfil];

// Un mismo path o schema en dos módulos es un error de documentación: se pisarían sin avisar.
function unir(partes, clave) {
  const resultado = {};
  for (const parte of partes) {
    for (const [nombre, valor] of Object.entries(parte[clave] ?? {})) {
      if (nombre in resultado) throw new Error(`OpenAPI: "${nombre}" está definido en dos módulos`);
      resultado[nombre] = valor;
    }
  }
  return resultado;
}

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "AI Ticket It — API",
    version: "1.0.0",
    description:
      "API de AI Ticket It, plataforma de venta de entradas para eventos (TP individual de Desarrollo de Software, " +
      "UTN FRBA). Persistencia en memoria: los datos vuelven al seed en cada reinicio.\n\n" +
      "Los ids son UUID: uno con formato inválido responde 400; uno válido que no existe, 404. Los errores tienen " +
      "siempre la forma de `Error`.\n\n" +
      "**Para probar las rutas con candado:** llamá a `POST /auth/login` con un usuario del seed (por ejemplo " +
      "`carla@example.com` / `Demo1234!`), copiá el `token` y pegalo en **Authorize**.",
  },
  servers: [{ url: "/", description: "Este servidor" }],
  tags: modulos.flatMap((modulo) => modulo.tags ?? []),
  paths: unir(modulos, "paths"),
  components: {
    schemas: unir([{ schemas: schemasComunes }, ...modulos], "schemas"),
    responses: respuestasComunes,
    securitySchemes: seguridad,
  },
};
