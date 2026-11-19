import express from "express";
import authRoutes from "./AuthRoutes.js";
import categoriaRoutes from "./CategoriaRoutes.js";
import compraRoutes from "./CompraRoutes.js";
import conversacionRoutes from "./ConversacionRoutes.js";
import eventoRoutes from "./EventoRoutes.js";
import favoritoRoutes from "./FavoritoRoutes.js";
import organizadorRoutes from "./OrganizadorRoutes.js";

// Prefijo de cada grupo de rutas. Se exporta para que el test de la documentación (Swagger) pueda listar todas
// las rutas y comprobar que cada una está documentada.
export const montajes = Object.freeze({
  "/auth": authRoutes,
  "/categorias": categoriaRoutes,
  "/eventos": eventoRoutes,
  "/compras": compraRoutes,
  "/conversaciones": conversacionRoutes,
  "/favoritos": favoritoRoutes,
  "/organizadores": organizadorRoutes,
});

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

for (const [prefijo, rutas] of Object.entries(montajes)) {
  router.use(prefijo, rutas);
}

export default router;
