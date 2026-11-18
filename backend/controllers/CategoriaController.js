import { BaseController } from "./BaseController.js";
import { CategoriaService } from "../services/CategoriaService.js";

export class CategoriaController extends BaseController {
  constructor(categoriaService = new CategoriaService()) {
    super();
    this.categoriaService = categoriaService;
  }

  async getAll(req, res, next) {
    try {
      const categorias = await this.categoriaService.getAll();

      return res.status(200).json(categorias);
    } catch (error) {
      return next(error);
    }
  }
}
