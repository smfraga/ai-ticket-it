import express from "express";
import { CompraController } from "../controllers/CompraController.js";
import { autenticar } from "../middlewares/autenticar.js";

const compraController = new CompraController();
const router = express.Router();

router.get("/", autenticar, (req, res, next) => compraController.getMisCompras(req, res, next));
router.post("/:id/cancelar", autenticar, (req, res, next) => compraController.cancelar(req, res, next));
router.post("/:id/utilizar", autenticar, (req, res, next) => compraController.utilizar(req, res, next));

export default router;
