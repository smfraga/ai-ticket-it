import { API_URL } from "../config";
import { leerSesion } from "./sesionStorage";

const TIMEOUT_MS = 10000;
const MENSAJE_SIN_CONEXION = "No se pudo conectar con el servidor";
const MENSAJE_INESPERADO = "Ocurrió un error inesperado";

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status; // 0 = sin respuesta del servidor
    this.details = details;
  }
}

let manejarNoAutorizado = () => {};

export const alRecibirNoAutorizado = (callback) => {
  manejarNoAutorizado = callback ?? (() => {});
};

export const mensajeDeError = (error) => (error instanceof ApiError ? error.message : MENSAJE_INESPERADO);

const armarQuery = (params = {}) => {
  const query = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null && valor !== "") query.append(clave, String(valor));
  }
  const texto = query.toString();
  return texto ? `?${texto}` : "";
};

const pedir = async (metodo, ruta, { body, params } = {}) => {
  const token = (await leerSesion())?.token;
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}${armarQuery(params)}`, {
      method: metodo,
      signal: controlador.signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, MENSAJE_SIN_CONEXION);
  } finally {
    clearTimeout(timer);
  }

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) manejarNoAutorizado();
    throw new ApiError(respuesta.status, datos?.message ?? MENSAJE_INESPERADO, datos?.details);
  }
  return datos;
};

export const api = {
  get: (ruta, params) => pedir("GET", ruta, { params }),
  post: (ruta, body) => pedir("POST", ruta, { body }),
  delete: (ruta) => pedir("DELETE", ruta),
};
