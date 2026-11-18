import express from "express";
import { CompraController } from "../controllers/CompraController.js";
import { autenticar } from "../middlewares/autenticar.js";
import { validate } from "../middlewares/validate.js";
import { enviarMensajeValidation } from "../validations/mensajeValidation.js";

const compraController = new CompraController();
const router = express.Router();

router.get("/", autenticar, (req, res, next) => compraController.getMisCompras(req, res, next));
router.post("/:id/cancelar", autenticar, (req, res, next) => compraController.cancelar(req, res, next));
router.post("/:id/utilizar", autenticar, (req, res, next) => compraController.utilizar(req, res, next));
router
  .route("/:id/mensajes")
  .get(autenticar, (req, res, next) => compraController.getMensajes(req, res, next))
  .post(autenticar, validate(enviarMensajeValidation), (req, res, next) =>
    compraController.enviarMensaje(req, res, next),
  );

export default router;
