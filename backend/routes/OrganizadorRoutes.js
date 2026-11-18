import express from "express";
import { ResenaController } from "../controllers/ResenaController.js";

const resenaController = new ResenaController();
const router = express.Router();

// Pública, como el catálogo: cualquiera puede ver el puntaje y las reseñas de un organizador.
router.get("/:id/resenias", (req, res, next) => resenaController.getDeOrganizador(req, res, next));

export default router;
