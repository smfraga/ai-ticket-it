import { api, ApiError, alRecibirNoAutorizado, mensajeDeError } from "./api";
import { leerSesion } from "./sesionStorage";

jest.mock("../config", () => ({ API_URL: "http://api.test" }));
jest.mock("./sesionStorage", () => ({ leerSesion: jest.fn() }));

const respuesta = (status, cuerpo) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => cuerpo,
});

describe("api", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    leerSesion.mockResolvedValue(null);
    alRecibirNoAutorizado(null);
  });

  it("agrega el Bearer cuando hay sesión", async () => {
    leerSesion.mockResolvedValue({ token: "abc" });
    fetch.mockResolvedValue(respuesta(200, []));

    await api.get("/favoritos");

    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer abc");
  });

  it("no manda Authorization sin sesión y arma la query sin vacíos", async () => {
    fetch.mockResolvedValue(respuesta(200, []));

    await api.get("/eventos", { texto: "rock", categoriaId: "", orden: undefined });

    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toBe("http://api.test/eventos?texto=rock");
    expect(opciones.headers.Authorization).toBeUndefined();
  });

  it("convierte un error del backend en ApiError con su mensaje", async () => {
    fetch.mockResolvedValue(respuesta(409, { message: "No hay cupo" }));

    await expect(api.post("/x", {})).rejects.toMatchObject({ status: 409, message: "No hay cupo" });
  });

  it("avisa un 401 solo si la request llevaba token", async () => {
    const avisar = jest.fn();
    alRecibirNoAutorizado(avisar);
    fetch.mockResolvedValue(respuesta(401, { message: "Credenciales inválidas" }));

    await expect(api.post("/auth/login", {})).rejects.toBeInstanceOf(ApiError);
    expect(avisar).not.toHaveBeenCalled();

    leerSesion.mockResolvedValue({ token: "vencido" });
    await expect(api.get("/compras")).rejects.toBeInstanceOf(ApiError);
    expect(avisar).toHaveBeenCalledTimes(1);
  });

  it("en un 400 de validación muestra el primer detalle", async () => {
    fetch.mockResolvedValue(
      respuesta(400, {
        message: "El cuerpo de la request es inválido",
        details: [{ message: "La contraseña debe tener al menos 8 caracteres" }],
      }),
    );

    const error = await api.post("/auth/registro", {}).catch((e) => e);

    expect(mensajeDeError(error)).toBe("La contraseña debe tener al menos 8 caracteres");
  });

  it("si no hay red devuelve status 0 y un mensaje claro", async () => {
    fetch.mockRejectedValue(new TypeError("Network request failed"));

    const error = await api.get("/eventos").catch((e) => e);

    expect(error.status).toBe(0);
    expect(mensajeDeError(error)).toBe("No se pudo conectar con el servidor");
  });
});
