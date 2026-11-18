import jwt from "jsonwebtoken";

export const SECRETO_DE_PRUEBA = "secreto-de-prueba";

// Devuelve el valor del header Authorization para un usuario con esos roles.
export const comoUsuario = (id, roles) =>
  `Bearer ${jwt.sign({ roles }, SECRETO_DE_PRUEBA, { subject: id, algorithm: "HS256", expiresIn: "1h" })}`;

export const comoComprador = (id = "comprador-de-prueba") => comoUsuario(id, ["COMPRADOR"]);

export const comoOrganizador = (id = "organizador-de-prueba") => comoUsuario(id, ["ORGANIZADOR"]);
