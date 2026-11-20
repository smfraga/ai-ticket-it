import { BaseController } from "./BaseController.js";
import { EventoService } from "../services/EventoService.js";
import { filtrosEventosValidation } from "../validations/eventoValidation.js";

export class EventoController extends BaseController {
  constructor(eventoService = new EventoService()) {
    super();
    this.eventoService = eventoService;
  }

  async getAll(req, res, next) {
    try {
      const { page, limit, ...filtros } = this.extraerYValidarQuery(req.query, filtrosEventosValidation);
      const resultado = await this.eventoService.buscarPaginado(page, limit, filtros);

      return res.status(200).json(resultado);
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const id = this.parsearId(req.params.id);
      const evento = await this.eventoService.getById(id);

      return res.status(200).json(evento);
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const evento = await this.eventoService.crear(req.usuario.id, req.body);

      return res.status(201).json(evento);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const id = this.parsearId(req.params.id);
      const evento = await this.eventoService.editar(req.usuario.id, id, req.body);

      return res.status(200).json(evento);
    } catch (error) {
      return next(error);
    }
  }

  async cancelar(req, res, next) {
    try {
      const id = this.parsearId(req.params.id);
      const evento = await this.eventoService.cancelar(req.usuario.id, id);

      return res.status(200).json(evento);
    } catch (error) {
      return next(error);
    }
  }
}
