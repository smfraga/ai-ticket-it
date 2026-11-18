import express from "express";
import { FavoritoController } from "../controllers/FavoritoController.js";
import { autenticar } from "../middlewares/autenticar.js";

const favoritoController = new FavoritoController();
const router = express.Router();

router.get("/", autenticar, (req, res, next) => favoritoController.getFavoritos(req, res, next));

export default router;
