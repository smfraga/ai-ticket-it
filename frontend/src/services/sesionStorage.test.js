import * as SecureStore from "expo-secure-store";
import { guardarSesion, leerSesion, tokenVencido } from "./sesionStorage";

jest.mock("expo-secure-store", () => {
  let guardado = null;
  return {
    setItemAsync: jest.fn(async (_clave, valor) => {
      guardado = valor;
    }),
    getItemAsync: jest.fn(async () => guardado),
    deleteItemAsync: jest.fn(async () => {
      guardado = null;
    }),
  };
});

const tokenCon = (exp) => `x.${btoa(JSON.stringify({ exp })).replace(/=/g, "")}.y`;
const enUnaHora = Math.floor(Date.now() / 1000) + 3600;

describe("sesionStorage", () => {
  it("detecta tokens vencidos, sin exp o mal formados", () => {
    expect(tokenVencido(tokenCon(1))).toBe(true);
    expect(tokenVencido(tokenCon(undefined))).toBe(true);
    expect(tokenVencido("basura")).toBe(true);
    expect(tokenVencido(tokenCon(enUnaHora))).toBe(false);
  });

  it("devuelve la sesión guardada mientras el token vale", async () => {
    const sesion = { token: tokenCon(enUnaHora), usuario: { id: "1" } };
    await guardarSesion(sesion);

    expect(await leerSesion()).toEqual(sesion);
  });

  it("descarta y borra la sesión con el token vencido", async () => {
    await guardarSesion({ token: tokenCon(1), usuario: { id: "1" } });

    expect(await leerSesion()).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });
});
