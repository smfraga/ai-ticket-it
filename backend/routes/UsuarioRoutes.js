import express from "express";
import { PerfilController } from "../controllers/PerfilController.js";

const perfilController = new PerfilController();
const router = express.Router();

// Pública: la foto de perfil de un usuario, para mostrarla en el chat y en la lista de mensajes.
router.get("/:id/foto", (req, res, next) => perfilController.getFoto(req, res, next));

export default router;
