import express from "express";
import { PerfilController } from "../controllers/PerfilController.js";
import { autenticar } from "../middlewares/autenticar.js";
import { validate } from "../middlewares/validate.js";
import { editarPerfilValidation } from "../validations/perfilValidation.js";

const perfilController = new PerfilController();
const router = express.Router();

// El perfil del usuario logueado (el del token).
router.get("/", autenticar, (req, res, next) => perfilController.obtener(req, res, next));
router.patch("/", autenticar, validate(editarPerfilValidation), (req, res, next) =>
  perfilController.editar(req, res, next),
);

export default router;
