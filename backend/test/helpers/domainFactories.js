import { Categoria } from "../../domain/Categoria.js";
import { Compra } from "../../domain/Compra.js";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import { Evento } from "../../domain/Evento.js";
import { rolUsuario } from "../../domain/RolUsuario.js";
import { TipoEntrada } from "../../domain/TipoEntrada.js";
import { Usuario } from "../../domain/Usuario.js";

// Fecha fija para que los tests no dependan del día en que se corren.
export const AHORA = new Date("2026-11-18T12:00:00Z");
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function enDias(dias, desde = AHORA) {
  return new Date(desde.getTime() + dias * MS_POR_DIA);
}

let contador = 0;
function unico(prefijo) {
  contador += 1;
  return `${prefijo}-${contador}`;
}

export const HASH = "$2b$12$hashDePrueba";

export function crearUsuario(overrides = {}) {
  return new Usuario(
    overrides.nombre ?? "Ana",
    overrides.apellido ?? "Pérez",
    overrides.email ?? `${unico("usuario")}@example.com`,
    overrides.passwordHash ?? HASH,
    overrides.roles ?? [rolUsuario.COMPRADOR],
  );
}

export function crearComprador(overrides = {}) {
  return crearUsuario({ roles: [rolUsuario.COMPRADOR], ...overrides });
}

export function crearOrganizador(overrides = {}) {
  return crearUsuario({ roles: [rolUsuario.ORGANIZADOR], ...overrides });
}

export function crearCategoria(overrides = {}) {
  return new Categoria(
    overrides.nombre ?? unico("Categoría"),
    overrides.descripcion ?? "Categoría de prueba",
  );
}

export function crearTipoEntrada(overrides = {}) {
  return new TipoEntrada(
    overrides.nombre ?? "General",
    overrides.descripcion ?? "Entrada de prueba",
    overrides.precio ?? 10000,
    overrides.cupo ?? 100,
  );
}

// Por defecto: evento dentro de 30 días, con General ($10000, cupo 100) y VIP ($25000, cupo 20).
export function crearEvento(overrides = {}) {
  return new Evento(
    overrides.nombre ?? unico("Evento"),
    overrides.descripcion ?? "Evento de prueba",
    overrides.categoria ?? crearCategoria(),
    overrides.fecha ?? enDias(30),
    overrides.organizador ?? crearOrganizador(),
    overrides.tiposEntrada ?? [
      crearTipoEntrada(),
      crearTipoEntrada({ nombre: "VIP", precio: 25000, cupo: 20 }),
    ],
    overrides.multimedia ?? [],
  );
}

// Por defecto: 2 entradas del primer tipo del evento, compradas en AHORA.
export function crearCompra(overrides = {}) {
  const evento = overrides.evento ?? crearEvento();
  return new Compra(
    overrides.comprador ?? crearComprador(),
    evento,
    overrides.tipoEntrada ?? evento.tiposEntrada[0],
    overrides.cantidad ?? 2,
    overrides.ahora ?? AHORA,
  );
}

// Lleva una compra nueva hasta el estado pedido por un camino válido.
export function crearCompraEn(estado, overrides = {}) {
  const compra = crearCompra(overrides);
  const comprador = compra.comprador;
  const organizador = compra.evento.organizador;
  const { PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA } = estadoCompra;
  const caminos = {
    [PENDIENTE]: [],
    [CONFIRMADA]: [[CONFIRMADA, comprador]],
    [UTILIZADA]: [
      [CONFIRMADA, comprador],
      [UTILIZADA, organizador],
    ],
    [CANCELADA]: [[CANCELADA, comprador]],
    [REEMBOLSADA]: [
      [CANCELADA, comprador],
      [REEMBOLSADA, comprador],
    ],
  };
  caminos[estado].forEach(([siguiente, quien]) => compra.actualizarEstado(siguiente, quien, AHORA));
  return compra;
}
