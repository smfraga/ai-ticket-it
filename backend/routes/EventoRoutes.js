import express from "express";
import { EventoController } from "../controllers/EventoController.js";
import { autenticar } from "../middlewares/autenticar.js";
import { validate } from "../middlewares/validate.js";
import { crearEventoValidation } from "../validations/eventoValidation.js";

const eventoController = new EventoController();
const router = express.Router();

router
  .route("/")
  .get((req, res, next) => eventoController.getAll(req, res, next))
  .post(autenticar, validate(crearEventoValidation), (req, res, next) =>
    eventoController.create(req, res, next),
  );

router.route("/:id").get((req, res, next) => eventoController.getById(req, res, next));

export default router;
