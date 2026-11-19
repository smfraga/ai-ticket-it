import { resolverApiUrl } from "./config";

describe("resolverApiUrl", () => {
  it("usa la IP del host de Expo con el puerto de la API", () => {
    expect(resolverApiUrl({ hostUri: "192.168.1.15:8081" })).toBe("http://192.168.1.15:3000");
  });

  it("el override tiene prioridad y pierde la barra final", () => {
    expect(resolverApiUrl({ override: "https://x.example/", hostUri: "192.168.1.15:8081" })).toBe("https://x.example");
  });

  it("sin datos cae en localhost", () => {
    expect(resolverApiUrl({})).toBe("http://localhost:3000");
  });
});
