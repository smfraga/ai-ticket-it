import { BaseController } from "./BaseController.js";
import { ResenaService } from "../services/ResenaService.js";

export class ResenaController extends BaseController {
  constructor(resenaService = new ResenaService()) {
    super();
    this.resenaService = resenaService;
  }

  async resenar(req, res, next) {
    try {
      const compraId = this.parsearId(req.params.id);
      const resenia = await this.resenaService.resenar(req.usuario.id, compraId, req.body);

      return res.status(201).json(resenia);
    } catch (error) {
      return next(error);
    }
  }

  async getDeEvento(req, res, next) {
    try {
      const eventoId = this.parsearId(req.params.id);
      const respuesta = await this.resenaService.listarDeEvento(eventoId);

      return res.status(200).json(respuesta);
    } catch (error) {
      return next(error);
    }
  }

  async getDeOrganizador(req, res, next) {
    try {
      const organizadorId = this.parsearId(req.params.id);
      const respuesta = await this.resenaService.listarDeOrganizador(organizadorId);

      return res.status(200).json(respuesta);
    } catch (error) {
      return next(error);
    }
  }
}
