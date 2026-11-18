import express from "express";
import { CategoriaController } from "../controllers/CategoriaController.js";

const categoriaController = new CategoriaController();
const router = express.Router();

router.route("/").get((req, res, next) => categoriaController.getAll(req, res, next));

export default router;
