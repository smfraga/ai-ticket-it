import { BaseController } from "./BaseController.js";
import { AuthService } from "../services/AuthService.js";

export class AuthController extends BaseController {
  constructor(authService = new AuthService()) {
    super();
    this.authService = authService;
  }

  async registro(req, res, next) {
    try {
      const sesion = await this.authService.registro(req.body);

      return res.status(201).json(sesion);
    } catch (error) {
      return next(error);
    }
  }

  async login(req, res, next) {
    try {
      const sesion = await this.authService.login(req.body);

      return res.status(200).json(sesion);
    } catch (error) {
      return next(error);
    }
  }
}
