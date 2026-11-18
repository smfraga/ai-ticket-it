import { AuthService } from "../services/AuthService.js";

export class AuthController {
  constructor(authService = new AuthService()) {
    this.authService = authService;
  }

  registro = async (req, res, next) => {
    try {
      const sesion = await this.authService.registro(req.body);

      return res.status(201).json(sesion);
    } catch (error) {
      return next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const sesion = await this.authService.login(req.body);

      return res.status(200).json(sesion);
    } catch (error) {
      return next(error);
    }
  };
}
