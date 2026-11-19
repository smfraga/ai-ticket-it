import { BaseController } from "./BaseController.js";
import { PerfilService } from "../services/PerfilService.js";

export class PerfilController extends BaseController {
  constructor(perfilService = new PerfilService()) {
    super();
    this.perfilService = perfilService;
  }

  async obtener(req, res, next) {
    try {
      const perfil = await this.perfilService.obtener(req.usuario.id);

      return res.status(200).json(perfil);
    } catch (error) {
      return next(error);
    }
  }

  async editar(req, res, next) {
    try {
      const usuario = await this.perfilService.editar(req.usuario.id, req.body);

      return res.status(200).json(usuario);
    } catch (error) {
      return next(error);
    }
  }
}
