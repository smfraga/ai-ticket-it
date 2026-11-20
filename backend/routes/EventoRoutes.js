import express from "express";
import { CompraController } from "../controllers/CompraController.js";
import { EventoController } from "../controllers/EventoController.js";
import { FavoritoController } from "../controllers/FavoritoController.js";
import { ResenaController } from "../controllers/ResenaController.js";
import { autenticar } from "../middlewares/autenticar.js";
import { validate } from "../middlewares/validate.js";
import { comprarValidation } from "../validations/compraValidation.js";
import {
  crearEventoValidation,
  editarEventoValidation,
  imagenEventoValidation,
} from "../validations/eventoValidation.js";

const eventoController = new EventoController();
const compraController = new CompraController();
const resenaController = new ResenaController();
const favoritoController = new FavoritoController();
const router = express.Router();

router
  .route("/")
  .get((req, res, next) => eventoController.getAll(req, res, next))
  .post(autenticar, validate(crearEventoValidation), (req, res, next) => eventoController.create(req, res, next));

router
  .route("/:id")
  .get((req, res, next) => eventoController.getById(req, res, next))
  .patch(autenticar, validate(editarEventoValidation), (req, res, next) => eventoController.update(req, res, next));

router.post("/:id/cancelar", autenticar, (req, res, next) => eventoController.cancelar(req, res, next));

// Imágenes adjuntas: subirlas es del organizador; verlas es público, como el detalle. El cuerpo de la subida lo lee
// un parser JSON con más tamaño (ver app.js).
router.post("/:id/imagenes", autenticar, validate(imagenEventoValidation), (req, res, next) =>
  eventoController.agregarImagen(req, res, next),
);
router.get("/:id/imagenes/:imagenId", (req, res, next) => eventoController.getImagen(req, res, next));

router
  .route("/:id/compras")
  .get(autenticar, (req, res, next) => compraController.getDeEvento(req, res, next))
  .post(autenticar, validate(comprarValidation), (req, res, next) => compraController.comprar(req, res, next));

router
  .route("/:id/favorito")
  .post(autenticar, (req, res, next) => favoritoController.guardar(req, res, next))
  .delete(autenticar, (req, res, next) => favoritoController.quitar(req, res, next));

// Pública, como el detalle del evento.
router.get("/:id/resenias", (req, res, next) => resenaController.getDeEvento(req, res, next));

export default router;
