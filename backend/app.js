import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { openapi } from "./docs/openapi/index.js";
import router from "./routes/router.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { errorLogger } from "./middlewares/errorLogger.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";

export const app = express();

app.use(cors());
// La subida de una imagen de evento (hasta 400 KB, unos 540 KB en base64) necesita más que los 100 KB por defecto.
// Va antes que el parser general: si ya leyó el cuerpo, el otro lo saltea. El resto de la API sigue con 100 KB.
app.post("/eventos/:id/imagenes", express.json({ limit: "600kb" }));
app.use(express.json());

// Documentación de la API: la especificación OpenAPI en JSON y la interfaz de Swagger para probarla.
app.get("/api-docs.json", (_req, res) => res.json(openapi));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "AI Ticket It — API" }));

app.use(router);

app.use(notFoundHandler);
app.use(errorLogger);
app.use(errorHandler);
