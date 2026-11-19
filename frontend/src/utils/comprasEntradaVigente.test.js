import { esEntradaVigente } from "./compras";

const compra = (estado, cancelado = false) => ({ estado, evento: { cancelado } });

describe("esEntradaVigente (talón naranja o gris)", () => {
  it.each(["PENDIENTE", "CONFIRMADA"])("una compra %s de un evento en pie sigue vigente", (estado) => {
    expect(esEntradaVigente(compra(estado))).toBe(true);
  });

  it.each(["UTILIZADA", "CANCELADA", "REEMBOLSADA"])("una compra %s ya no está vigente", (estado) => {
    expect(esEntradaVigente(compra(estado))).toBe(false);
  });

  it("una compra confirmada de un evento cancelado no está vigente (por si llega una respuesta vieja)", () => {
    expect(esEntradaVigente(compra("CONFIRMADA", true))).toBe(false);
  });
});
