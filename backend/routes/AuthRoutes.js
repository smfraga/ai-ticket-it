import express from "express";
import { AuthController } from "../controllers/AuthController.js";
import { limitarIntentos } from "../middlewares/limitarIntentos.js";
import { validate } from "../middlewares/validate.js";
import { loginValidation, registroValidation } from "../validations/authValidation.js";

const authController = new AuthController();
const router = express.Router();

const QUINCE_MINUTOS = 15 * 60 * 1000;
const limitarLoginsFallidos = limitarIntentos({
  maximo: 10,
  ventanaMs: QUINCE_MINUTOS,
  soloFallidos: true,
});

router
  .route("/registro")
  .post(validate(registroValidation), (req, res, next) => authController.registro(req, res, next));

router
  .route("/login")
  .post(limitarLoginsFallidos, validate(loginValidation), (req, res, next) => authController.login(req, res, next));

export default router;
