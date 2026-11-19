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
app.use(express.json());

// Documentación de la API: la especificación OpenAPI en JSON y la interfaz de Swagger para probarla.
app.get("/api-docs.json", (_req, res) => res.json(openapi));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "AI Ticket It — API" }));

app.use(router);

app.use(notFoundHandler);
app.use(errorLogger);
app.use(errorHandler);
