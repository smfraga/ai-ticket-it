import { ValidationError } from "../errors/AppError.js";
import { idValidation } from "../validations/idValidation.js";

export class BaseController {
  parsearId(idParam) {
    if (!idValidation.safeParse(idParam).success) {
      throw new ValidationError("El parámetro id debe ser un UUID válido");
    }

    return idParam;
  }

  extraerYValidarQuery(query, schema) {
    const resultado = schema.safeParse(query);

    if (!resultado.success) {
      throw new ValidationError("Los parámetros de la query son inválidos", resultado.error.issues);
    }

    return resultado.data;
  }
}
