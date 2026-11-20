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

  async cambiarFoto(req, res, next) {
    try {
      const usuario = await this.perfilService.cambiarFoto(req.usuario.id, req.body.imagen);

      return res.status(200).json(usuario);
    } catch (error) {
      return next(error);
    }
  }

  async quitarFoto(req, res, next) {
    try {
      const usuario = await this.perfilService.quitarFoto(req.usuario.id);

      return res.status(200).json(usuario);
    } catch (error) {
      return next(error);
    }
  }

  // La foto como imagen (no JSON). La URL lleva la versión, así que se puede guardar en caché un día.
  async getFoto(req, res, next) {
    try {
      const usuarioId = this.parsearId(req.params.id);
      const { tipo, datos } = await this.perfilService.fotoDe(usuarioId);

      res.set("Content-Type", tipo);
      res.set("Cache-Control", "public, max-age=86400");
      return res.status(200).send(datos);
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
