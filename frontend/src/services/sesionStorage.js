import * as SecureStore from "expo-secure-store";

const CLAVE = "ait.sesion";

const leerPayload = (token) => {
  const payload = token.split(".")[1];
  return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
};

export const tokenVencido = (token, ahora = Date.now()) => {
  try {
    const { exp } = leerPayload(token);
    return typeof exp !== "number" || exp * 1000 <= ahora;
  } catch {
    return true;
  }
};

export const guardarSesion = async (sesion) => {
  try {
    await SecureStore.setItemAsync(CLAVE, JSON.stringify(sesion));
    return true;
  } catch {
    return false;
  }
};

export const borrarSesion = async () => {
  try {
    await SecureStore.deleteItemAsync(CLAVE);
  } catch {
    // Sin storage disponible no hay nada que borrar.
  }
};

// Devuelve { token, usuario } o null si no hay sesión o el token ya venció.
export const leerSesion = async () => {
  try {
    const sesion = JSON.parse(await SecureStore.getItemAsync(CLAVE));
    if (!sesion?.token || tokenVencido(sesion.token)) {
      await borrarSesion();
      return null;
    }
    return sesion;
  } catch {
    return null;
  }
};
