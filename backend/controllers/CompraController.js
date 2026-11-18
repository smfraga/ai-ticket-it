import { BaseController } from "./BaseController.js";
import { CompraService } from "../services/CompraService.js";

export class CompraController extends BaseController {
  constructor(compraService = new CompraService()) {
    super();
    this.compraService = compraService;
  }

  async comprar(req, res, next) {
    try {
      const eventoId = this.parsearId(req.params.id);
      const compra = await this.compraService.comprar(req.usuario.id, eventoId, req.body);

      return res.status(201).json(compra);
    } catch (error) {
      return next(error);
    }
  }

  async getMisCompras(req, res, next) {
    try {
      const compras = await this.compraService.listarDelComprador(req.usuario.id);

      return res.status(200).json(compras);
    } catch (error) {
      return next(error);
    }
  }

  async getDeEvento(req, res, next) {
    try {
      const eventoId = this.parsearId(req.params.id);
      const respuesta = await this.compraService.listarDeEvento(req.usuario.id, eventoId);

      return res.status(200).json(respuesta);
    } catch (error) {
      return next(error);
    }
  }
}
