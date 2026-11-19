import { describe, expect, it } from "@jest/globals";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import { ConflictError, ForbiddenError, ValidationError } from "../../errors/AppError.js";
import {
  AHORA,
  crearCategoria,
  crearCompra,
  crearCompraEn,
  crearEvento,
  crearOrganizador,
  crearTipoEntrada,
  enDias,
} from "../helpers/domainFactories.js";

// Evento de Olivia en 30 días con General ($10000, cupo 100, id "general") y VIP ($25000, cupo 20, id "vip").
function eventoDeOlivia() {
  const olivia = crearOrganizador({ id: "olivia" });
  const evento = crearEvento({ organizador: olivia });
  evento.id = "evento";
  evento.tiposEntrada[0].id = "general";
  evento.tiposEntrada[1].id = "vip";
  return { evento, olivia, general: evento.tiposEntrada[0], vip: evento.tiposEntrada[1] };
}

// Los dos tipos tal como están, para mandar la lista completa y cambiar solo una parte.
const tiposActuales = (evento) =>
  evento.tiposEntrada.map(({ id, nombre, descripcion, precio, cupo }) => ({ id, nombre, descripcion, precio, cupo }));

describe("TipoEntrada al editarse", () => {
  it("sin ventas cambia nombre, descripción, precio y cupo", () => {
    const tipo = crearTipoEntrada();

    tipo.editar({ nombre: "Campo", descripcion: "De pie", precio: 12000, cupo: 150 });

    expect(tipo).toMatchObject({ nombre: "Campo", descripcion: "De pie", precio: 12000, cupo: 150, vendidas: 0 });
  });

  it("con ventas puede subir o bajar el cupo hasta lo vendido", () => {
    const tipo = crearTipoEntrada({ cupo: 100 });
    tipo.reservar(30);

    tipo.editar({ cupo: 30 });

    expect(tipo.cupo).toBe(30);
    expect(tipo.disponibles()).toBe(0);
  });

  it("con ventas no deja el cupo por debajo de lo vendido", () => {
    const tipo = crearTipoEntrada({ cupo: 100 });
    tipo.reservar(30);

    expect(() => tipo.editar({ cupo: 29 })).toThrow(
      new ConflictError("El cupo de General no puede ser menor a las 30 entradas vendidas"),
    );
    expect(tipo.cupo).toBe(100);
  });

  it("con ventas no cambia el precio, pero acepta el mismo precio", () => {
    const tipo = crearTipoEntrada({ precio: 10000 });
    tipo.reservar(1);

    expect(() => tipo.editar({ precio: 9000 })).toThrow(
      new ConflictError("No se puede cambiar el precio de General: ya tiene entradas vendidas"),
    );
    tipo.editar({ precio: 10000, nombre: "Campo" });
    expect(tipo).toMatchObject({ precio: 10000, nombre: "Campo" });
  });

  it("valida los datos como al crearlo", () => {
    const tipo = crearTipoEntrada();

    expect(() => tipo.editar({ nombre: " " })).toThrow(ValidationError);
    expect(() => tipo.editar({ precio: -1 })).toThrow(ValidationError);
    expect(() => tipo.editar({ cupo: 0 })).toThrow(ValidationError);
    expect(() => tipo.editar({ cupo: 1.5 })).toThrow(ValidationError);
  });

  it("tieneVentas es verdadero solo con entradas reservadas", () => {
    const tipo = crearTipoEntrada();
    expect(tipo.tieneVentas()).toBe(false);
    tipo.reservar(1);
    expect(tipo.tieneVentas()).toBe(true);
    tipo.liberar(1);
    expect(tipo.tieneVentas()).toBe(false);
  });
});

describe("Evento.editar", () => {
  it("el organizador cambia nombre, descripción, categoría, fecha y multimedia", () => {
    const { evento, olivia } = eventoDeOlivia();
    const teatro = crearCategoria({ nombre: "Teatro" });

    evento.editar(
      {
        nombre: "Recital acústico",
        descripcion: "Versión desenchufada",
        categoria: teatro,
        fecha: enDias(40),
        multimedia: ["https://example.com/a.jpg"],
      },
      olivia,
      AHORA,
    );

    expect(evento).toMatchObject({
      nombre: "Recital acústico",
      descripcion: "Versión desenchufada",
      categoria: teatro,
      fecha: enDias(40),
      multimedia: ["https://example.com/a.jpg"],
    });
  });

  it("solo cambia lo que viene", () => {
    const { evento, olivia } = eventoDeOlivia();
    const antes = { nombre: evento.nombre, fecha: evento.fecha, tipos: [...evento.tiposEntrada] };

    evento.editar({ descripcion: "Nueva" }, olivia, AHORA);

    expect(evento.descripcion).toBe("Nueva");
    expect(evento.nombre).toBe(antes.nombre);
    expect(evento.fecha).toBe(antes.fecha);
    expect(evento.tiposEntrada).toEqual(antes.tipos);
  });

  it("solo lo edita su organizador (403)", () => {
    const { evento } = eventoDeOlivia();
    const otro = crearOrganizador({ id: "octavio" });

    expect(() => evento.editar({ nombre: "Otro" }, otro, AHORA)).toThrow(
      new ForbiddenError("Solo el organizador del evento puede editarlo"),
    );
  });

  it("no edita un evento que ya se realizó (409)", () => {
    const { evento, olivia } = eventoDeOlivia();

    expect(() => evento.editar({ nombre: "Otro" }, olivia, enDias(31))).toThrow(
      new ConflictError("No se puede editar un evento que ya se realizó"),
    );
  });

  it("la fecha nueva tiene que ser futura (400), sin tocar el resto", () => {
    const { evento, olivia } = eventoDeOlivia();
    const nombre = evento.nombre;

    expect(() => evento.editar({ nombre: "Otro", fecha: AHORA }, olivia, AHORA)).toThrow(
      new ValidationError("La fecha del evento debe ser futura"),
    );
    expect(evento.nombre).toBe(nombre);
  });

  it("rechaza nombre vacío, categoría nula y multimedia inválida (400)", () => {
    const { evento, olivia } = eventoDeOlivia();

    expect(() => evento.editar({ nombre: "  " }, olivia, AHORA)).toThrow(ValidationError);
    expect(() => evento.editar({ categoria: null }, olivia, AHORA)).toThrow(ValidationError);
    expect(() => evento.editar({ multimedia: [""] }, olivia, AHORA)).toThrow(ValidationError);
  });

  describe("tipos de entrada", () => {
    it("edita los existentes por id, agrega los nuevos y quita los que faltan sin ventas", () => {
      const { evento, olivia, general } = eventoDeOlivia();

      evento.editar(
        {
          tiposEntrada: [
            { id: "general", nombre: "Campo", precio: 11000, cupo: 200 },
            { nombre: "Platea", descripcion: "Butacas", precio: 18000, cupo: 50 },
          ],
        },
        olivia,
        AHORA,
      );

      expect(evento.tiposEntrada).toHaveLength(2);
      expect(evento.tiposEntrada[0]).toBe(general);
      expect(general).toMatchObject({ nombre: "Campo", precio: 11000, cupo: 200 });
      expect(evento.tiposEntrada[1]).toMatchObject({ id: undefined, nombre: "Platea", precio: 18000, cupo: 50 });
    });

    it("con ventas: sube el cupo y cambia el nombre, pero no el precio", () => {
      const { evento, olivia, general } = eventoDeOlivia();
      crearCompra({ evento, tipoEntrada: general, cantidad: 5 });
      const tipos = tiposActuales(evento);

      evento.editar({ tiposEntrada: [{ ...tipos[0], nombre: "Campo", cupo: 150 }, tipos[1]] }, olivia, AHORA);
      expect(general).toMatchObject({ nombre: "Campo", cupo: 150, vendidas: 5 });

      expect(() => evento.editar({ tiposEntrada: [{ ...tipos[0], precio: 1 }, tipos[1]] }, olivia, AHORA)).toThrow(
        new ConflictError("No se puede cambiar el precio de Campo: ya tiene entradas vendidas"),
      );
    });

    it("no baja el cupo de un tipo por debajo de lo vendido (409)", () => {
      const { evento, olivia, vip } = eventoDeOlivia();
      crearCompra({ evento, tipoEntrada: vip, cantidad: 3 });
      const tipos = tiposActuales(evento);

      expect(() => evento.editar({ tiposEntrada: [tipos[0], { ...tipos[1], cupo: 2 }] }, olivia, AHORA)).toThrow(
        new ConflictError("El cupo de VIP no puede ser menor a las 3 entradas vendidas"),
      );
    });

    it("no quita un tipo con ventas (409)", () => {
      const { evento, olivia, vip } = eventoDeOlivia();
      crearCompra({ evento, tipoEntrada: vip, cantidad: 1 });

      expect(() => evento.editar({ tiposEntrada: [tiposActuales(evento)[0]] }, olivia, AHORA)).toThrow(
        new ConflictError("No se puede quitar VIP: ya tiene entradas vendidas"),
      );
      expect(evento.tiposEntrada).toHaveLength(2);
    });

    it("quita un tipo cuyas compras se cancelaron (ya no tiene ventas)", () => {
      const { evento, olivia, vip } = eventoDeOlivia();
      crearCompraEn(estadoCompra.CANCELADA, { evento, tipoEntrada: vip });

      evento.editar({ tiposEntrada: [tiposActuales(evento)[0]] }, olivia, AHORA);

      expect(evento.tiposEntrada.map((tipo) => tipo.nombre)).toEqual(["General"]);
    });

    it("rechaza una lista vacía, un id ajeno y un id repetido (400)", () => {
      const { evento, olivia } = eventoDeOlivia();
      const [general] = tiposActuales(evento);

      expect(() => evento.editar({ tiposEntrada: [] }, olivia, AHORA)).toThrow(
        new ValidationError("El evento debe tener al menos un tipo de entrada"),
      );
      expect(() => evento.editar({ tiposEntrada: [{ ...general, id: "otro" }] }, olivia, AHORA)).toThrow(
        new ValidationError("El tipo de entrada no pertenece al evento"),
      );
      expect(() => evento.editar({ tiposEntrada: [general, { ...general, nombre: "Otro" }] }, olivia, AHORA)).toThrow(
        new ValidationError("El tipo de entrada no pertenece al evento"),
      );
    });

    it("rechaza nombres repetidos, también entre un tipo editado y uno nuevo (400)", () => {
      const { evento, olivia } = eventoDeOlivia();
      const [general, vip] = tiposActuales(evento);

      expect(() => evento.editar({ tiposEntrada: [general, { ...vip, nombre: "general" }] }, olivia, AHORA)).toThrow(
        new ValidationError("El evento no puede tener dos tipos de entrada con el mismo nombre"),
      );
      expect(() =>
        evento.editar({ tiposEntrada: [general, vip, { nombre: "VIP", precio: 1, cupo: 1 }] }, olivia, AHORA),
      ).toThrow(new ValidationError("El evento no puede tener dos tipos de entrada con el mismo nombre"));
    });

    it("si un tipo falla, no se aplica ningún cambio (ni a los tipos ni al evento)", () => {
      const { evento, olivia, general, vip } = eventoDeOlivia();
      crearCompra({ evento, tipoEntrada: vip, cantidad: 3 });
      const [g, v] = tiposActuales(evento);

      expect(() =>
        evento.editar(
          {
            nombre: "Otro",
            tiposEntrada: [
              { ...g, nombre: "Campo", cupo: 500 },
              { ...v, cupo: 1 },
            ],
          },
          olivia,
          AHORA,
        ),
      ).toThrow(ConflictError);
      expect(general).toMatchObject({ nombre: "General", cupo: 100 });
      expect(evento.nombre).not.toBe("Otro");
    });
  });
});

describe("Compra.estaActiva", () => {
  it("es verdadero en PENDIENTE y CONFIRMADA, falso en el resto", () => {
    const { PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA } = estadoCompra;
    const activa = (estado) => crearCompraEn(estado).estaActiva();

    expect([PENDIENTE, CONFIRMADA].map(activa)).toEqual([true, true]);
    expect([UTILIZADA, CANCELADA, REEMBOLSADA].map(activa)).toEqual([false, false, false]);
  });
});
