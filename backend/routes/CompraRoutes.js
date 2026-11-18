import express from "express";
import { CompraController } from "../controllers/CompraController.js";
import { autenticar } from "../middlewares/autenticar.js";

const compraController = new CompraController();
const router = express.Router();

router.get("/", autenticar, (req, res, next) => compraController.getMisCompras(req, res, next));

export default router;
