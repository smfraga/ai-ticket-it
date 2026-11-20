import {
  errorDeResenia,
  ETIQUETAS_DE_ESTADO,
  filtrarPorGrupo,
  GRUPO_TODAS,
  gruposDeEstado,
  grupoVigente,
  motivoSinCancelacion,
  motivoSinUtilizar,
  puedeMarcarUtilizada,
  puedePagar,
  puedeReseniar,
  puedeCancelar,
  resumenDeEstados,
  textoDeConfirmacionDeCancelacion,
  textoDeConfirmacionDeUso,
  textoDiasRestantes,
  textoEntradas,
} from "./compras";

const compra = (estado, yaPaso = false) => ({ estado, evento: { yaPaso } });

describe("puedeReseniar y errorDeResenia", () => {
  it("se reseña solo una compra UTILIZADA sin reseña", () => {
    expect(puedeReseniar({ estado: "UTILIZADA", resenia: null })).toBe(true);
    expect(puedeReseniar({ estado: "UTILIZADA", resenia: { id: "r1" } })).toBe(false);
    expect(puedeReseniar({ estado: "CONFIRMADA", resenia: null })).toBe(false);
  });

  it("exige una puntuación entera de 1 a 5", () => {
    expect(errorDeResenia({ puntuacion: 0, detalle: "Bien" })).toMatch(/puntuación/);
    expect(errorDeResenia({ puntuacion: 6, detalle: "Bien" })).toMatch(/puntuación/);
    expect(errorDeResenia({ puntuacion: null, detalle: "Bien" })).toMatch(/puntuación/);
  });

  it("exige un comentario que no sea solo espacios", () => {
    expect(errorDeResenia({ puntuacion: 4, detalle: "   " })).toMatch(/comentario/);
    expect(errorDeResenia({ puntuacion: 4, detalle: "Muy buen show" })).toBeNull();
  });
});

describe("puedeCancelar y motivoSinCancelacion", () => {
  it("se puede cancelar una PENDIENTE o CONFIRMADA de un evento que no pasó", () => {
    expect(puedeCancelar(compra("PENDIENTE"))).toBe(true);
    expect(puedeCancelar(compra("CONFIRMADA"))).toBe(true);
    expect(motivoSinCancelacion(compra("CONFIRMADA"))).toBeNull();
  });

  it("no se puede si está UTILIZADA, y lo explica", () => {
    expect(puedeCancelar(compra("UTILIZADA"))).toBe(false);
    expect(motivoSinCancelacion(compra("UTILIZADA"))).toBe("Esta compra ya fue utilizada: no se puede cancelar.");
  });

  it("no se puede si el evento ya pasó, y lo explica", () => {
    expect(puedeCancelar(compra("CONFIRMADA", true))).toBe(false);
    expect(motivoSinCancelacion(compra("CONFIRMADA", true))).toBe("El evento ya se realizó: no se puede cancelar.");
  });

  it("una compra ya cancelada o reembolsada no se cancela y no hace falta un motivo extra", () => {
    for (const estado of ["CANCELADA", "REEMBOLSADA"]) {
      expect(puedeCancelar(compra(estado))).toBe(false);
      expect(motivoSinCancelacion(compra(estado))).toBeNull();
    }
  });

  it("el aviso de confirmación menciona el reembolso solo si estaba CONFIRMADA", () => {
    expect(textoDeConfirmacionDeCancelacion(compra("CONFIRMADA"), "$24.000")).toContain("reembolsa $24.000");
    expect(textoDeConfirmacionDeCancelacion(compra("PENDIENTE"), "$24.000")).not.toContain("reembolsa");
  });
});

describe("textoDiasRestantes", () => {
  it("habla en singular, hoy y plural", () => {
    expect(textoDiasRestantes(0)).toBe("El evento es hoy");
    expect(textoDiasRestantes(1)).toBe("Falta 1 día");
    expect(textoDiasRestantes(12)).toBe("Faltan 12 días");
  });

  it("no muestra nada si la compra no está confirmada (null)", () => {
    expect(textoDiasRestantes(null)).toBeNull();
  });
});

describe("puedePagar", () => {
  it("se paga solo una PENDIENTE de un evento que no pasó", () => {
    expect(puedePagar(compra("PENDIENTE"))).toBe(true);
    expect(puedePagar(compra("PENDIENTE", true))).toBe(false);
    for (const estado of ["CONFIRMADA", "UTILIZADA", "CANCELADA", "REEMBOLSADA"]) {
      expect(puedePagar(compra(estado))).toBe(false);
    }
  });
});

describe("puedeMarcarUtilizada y motivoSinUtilizar", () => {
  it("solo se marca una compra CONFIRMADA, aunque el evento no haya pasado", () => {
    expect(puedeMarcarUtilizada(compra("CONFIRMADA"))).toBe(true);
    for (const estado of ["PENDIENTE", "UTILIZADA", "CANCELADA", "REEMBOLSADA"]) {
      expect(puedeMarcarUtilizada(compra(estado))).toBe(false);
    }
  });

  it("explica por qué una PENDIENTE no se puede marcar; en los demás estados alcanza con la etiqueta", () => {
    expect(motivoSinUtilizar(compra("PENDIENTE"))).toMatch(/no está confirmada/);
    expect(motivoSinUtilizar(compra("UTILIZADA"))).toBeNull();
    expect(motivoSinUtilizar(compra("CANCELADA"))).toBeNull();
  });

  it("la confirmación nombra al comprador y concuerda con la cantidad", () => {
    const comprador = { nombre: "Carla", apellido: "Gómez" };
    expect(textoDeConfirmacionDeUso({ comprador, cantidad: 1 })).toContain("Carla Gómez usó su entrada");
    expect(textoDeConfirmacionDeUso({ comprador, cantidad: 3 })).toContain("usó sus 3 entradas");
  });
});

describe("resumenDeEstados", () => {
  it("cuenta por estado, en el orden del ciclo de vida y concordando en número", () => {
    const compras = ["REEMBOLSADA", "CONFIRMADA", "UTILIZADA", "CONFIRMADA", "PENDIENTE"].map((estado) => ({ estado }));

    expect(resumenDeEstados(compras)).toBe("1 pendiente de pago · 2 confirmadas · 1 utilizada · 1 reembolsada");
  });

  it("sin compras devuelve null", () => {
    expect(resumenDeEstados([])).toBeNull();
  });
});

describe("gruposDeEstado, grupoVigente y filtrarPorGrupo", () => {
  const compras = ["UTILIZADA", "CONFIRMADA", "REEMBOLSADA", "CONFIRMADA", "CANCELADA", "UTILIZADA", "CONFIRMADA"].map(
    (estado, i) => ({ id: `c${i}`, estado }),
  );

  it("muestra Todas y solo los grupos presentes, en orden y con su cantidad", () => {
    expect(gruposDeEstado(compras)).toEqual([
      { id: GRUPO_TODAS, etiqueta: "Todas", cantidad: 7 },
      { id: "CONFIRMADA", etiqueta: "Confirmadas", cantidad: 3 },
      { id: "UTILIZADA", etiqueta: "Utilizadas", cantidad: 2 },
      { id: "CANCELADA", etiqueta: "Canceladas", cantidad: 2 },
    ]);
  });

  it("con un solo grupo o sin compras no hay chips", () => {
    expect(gruposDeEstado([{ estado: "CANCELADA" }, { estado: "REEMBOLSADA" }])).toEqual([]);
    expect(gruposDeEstado([])).toEqual([]);
  });

  it("Pendientes aparece con dos grupos", () => {
    const grupos = gruposDeEstado([{ estado: "PENDIENTE" }, { estado: "CONFIRMADA" }]);
    expect(grupos.map(({ id }) => id)).toEqual([GRUPO_TODAS, "CONFIRMADA", "PENDIENTE"]);
  });

  it("Canceladas junta CANCELADA y REEMBOLSADA", () => {
    expect(filtrarPorGrupo(compras, "CANCELADA").map(({ id }) => id)).toEqual(["c2", "c4"]);
  });

  it("filtra por un estado y Todas devuelve la lista entera", () => {
    expect(filtrarPorGrupo(compras, "CONFIRMADA").map(({ id }) => id)).toEqual(["c1", "c3", "c6"]);
    expect(filtrarPorGrupo(compras, "UTILIZADA").map(({ id }) => id)).toEqual(["c0", "c5"]);
    expect(filtrarPorGrupo(compras, GRUPO_TODAS)).toBe(compras);
  });

  it("el grupo elegido vuelve a Todas si ya no está entre los chips", () => {
    const grupos = gruposDeEstado(compras);
    expect(grupoVigente(grupos, "UTILIZADA")).toBe("UTILIZADA");
    expect(grupoVigente(grupos, "PENDIENTE")).toBe(GRUPO_TODAS);
    expect(grupoVigente([], "CONFIRMADA")).toBe(GRUPO_TODAS);
  });
});

describe("textoEntradas y estados", () => {
  it("concuerda en singular y plural", () => {
    expect(textoEntradas(1)).toBe("1 entrada");
    expect(textoEntradas(3)).toBe("3 entradas");
  });

  it("tiene una etiqueta para cada estado del backend", () => {
    expect(Object.keys(ETIQUETAS_DE_ESTADO)).toEqual([
      "PENDIENTE",
      "CONFIRMADA",
      "UTILIZADA",
      "CANCELADA",
      "REEMBOLSADA",
    ]);
  });
});
