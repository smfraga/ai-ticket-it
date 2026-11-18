import { BaseController } from "./BaseController.js";
import { FavoritoService } from "../services/FavoritoService.js";

export class FavoritoController extends BaseController {
  constructor(favoritoService = new FavoritoService()) {
    super();
    this.favoritoService = favoritoService;
  }

  // 201 la primera vez, 200 si el evento ya era favorito.
  async guardar(req, res, next) {
    try {
      const eventoId = this.parsearId(req.params.id);
      const { agregado, evento } = await this.favoritoService.guardar(req.usuario.id, eventoId);

      return res.status(agregado ? 201 : 200).json(evento);
    } catch (error) {
      return next(error);
    }
  }

  // 204 haya sido favorito o no.
  async quitar(req, res, next) {
    try {
      const eventoId = this.parsearId(req.params.id);
      await this.favoritoService.quitar(req.usuario.id, eventoId);

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }

  async getFavoritos(req, res, next) {
    try {
      const favoritos = await this.favoritoService.listar(req.usuario.id);

      return res.status(200).json(favoritos);
    } catch (error) {
      return next(error);
    }
  }
}
