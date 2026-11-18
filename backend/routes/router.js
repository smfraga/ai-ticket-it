import express from "express";
import authRoutes from "./AuthRoutes.js";
import categoriaRoutes from "./CategoriaRoutes.js";
import compraRoutes from "./CompraRoutes.js";
import eventoRoutes from "./EventoRoutes.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/categorias", categoriaRoutes);
router.use("/eventos", eventoRoutes);
router.use("/compras", compraRoutes);

export default router;
