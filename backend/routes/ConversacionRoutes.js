import express from "express";
import { CompraController } from "../controllers/CompraController.js";
import { autenticar } from "../middlewares/autenticar.js";

const compraController = new CompraController();
const router = express.Router();

// Los chats del usuario (uno por compra), para la pestaña Mensajes.
router.get("/", autenticar, (req, res, next) => compraController.getConversaciones(req, res, next));

export default router;
