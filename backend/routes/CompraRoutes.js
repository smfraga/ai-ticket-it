import express from "express";
import { CompraController } from "../controllers/CompraController.js";
import { ResenaController } from "../controllers/ResenaController.js";
import { autenticar } from "../middlewares/autenticar.js";
import { validate } from "../middlewares/validate.js";
import { enviarMensajeValidation } from "../validations/mensajeValidation.js";
import { crearReseniaValidation } from "../validations/reseniaValidation.js";

const compraController = new CompraController();
const resenaController = new ResenaController();
const router = express.Router();

router.get("/", autenticar, (req, res, next) => compraController.getMisCompras(req, res, next));
router.get("/:id", autenticar, (req, res, next) => compraController.getDetalle(req, res, next));
router.post("/:id/cancelar", autenticar, (req, res, next) => compraController.cancelar(req, res, next));
router.post("/:id/pagar", autenticar, (req, res, next) => compraController.pagar(req, res, next));
router.post("/:id/utilizar", autenticar, (req, res, next) => compraController.utilizar(req, res, next));
router.post("/:id/resenia", autenticar, validate(crearReseniaValidation), (req, res, next) =>
  resenaController.resenar(req, res, next),
);
router
  .route("/:id/mensajes")
  .get(autenticar, (req, res, next) => compraController.getMensajes(req, res, next))
  .post(autenticar, validate(enviarMensajeValidation), (req, res, next) =>
    compraController.enviarMensaje(req, res, next),
  );

export default router;
