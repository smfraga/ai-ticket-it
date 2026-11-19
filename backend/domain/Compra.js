import { ConflictError, ForbiddenError, ValidationError } from "../errors/AppError.js";
import { CambioEstadoCompra } from "./CambioEstadoCompra.js";
import { estadoCompra, transicionesCompra } from "./EstadoCompra.js";
import { Mensaje } from "./Mensaje.js";
import { rolUsuario } from "./RolUsuario.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Las compras en estos estados ocupan lugar en el cupo del tipo de entrada.
const ESTADOS_QUE_OCUPAN_CUPO = [
  estadoCompra.PENDIENTE,
  estadoCompra.CONFIRMADA,
  estadoCompra.UTILIZADA,
];

function ocupaCupo(estado) {
  return ESTADOS_QUE_OCUPAN_CUPO.includes(estado);
}

// Medianoche del mismo día, en la hora local del servidor.
function inicioDelDia(fecha) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  return inicio.getTime();
}

export class Compra {
  id
  comprador
  evento
  tipoEntrada
  cantidad
  total
  estado
  mensajes
  historial

  constructor(comprador, evento, tipoEntrada, cantidad, ahora = new Date()) {
    if (!comprador) {
      throw new ValidationError("La compra debe tener un comprador");
    }
    if (!evento) {
      throw new ValidationError("La compra debe ser de un evento");
    }
    if (!tipoEntrada) {
      throw new ValidationError("La compra debe tener un tipo de entrada");
    }
    if (!comprador.tieneRol(rolUsuario.COMPRADOR)) {
      throw new ForbiddenError("Solo un usuario comprador puede comprar entradas");
    }
    // Un usuario con los dos roles no puede comprar en su propio evento: después podría marcar la entrada
    // como utilizada y reseñarse a sí mismo para subir su puntaje.
    if (evento.esOrganizador(comprador)) {
      throw new ForbiddenError("No podés comprar entradas de tu propio evento");
    }
    if (!evento.tieneTipoEntrada(tipoEntrada)) {
      throw new ValidationError("El tipo de entrada no pertenece al evento");
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new ValidationError("La cantidad debe ser un número entero positivo");
    }
    if (evento.yaPaso(ahora)) {
      throw new ConflictError("No se pueden comprar entradas de un evento que ya se realizó");
    }

    tipoEntrada.reservar(cantidad);

    this.comprador = comprador;
    this.evento = evento;
    this.tipoEntrada = tipoEntrada;
    this.cantidad = cantidad;
    this.total = tipoEntrada.precio * cantidad;
    this.estado = estadoCompra.PENDIENTE;
    this.mensajes = [];
    this.historial = [new CambioEstadoCompra(estadoCompra.PENDIENTE, comprador, ahora)];
  }

  estaConfirmada() {
    return this.estado === estadoCompra.CONFIRMADA;
  }

  estaUtilizada() {
    return this.estado === estadoCompra.UTILIZADA;
  }

  puedePasarA(nuevoEstado) {
    return transicionesCompra[this.estado].includes(nuevoEstado);
  }

  actualizarEstado(nuevoEstado, quien, fechaHora = new Date()) {
    // Se arma el cambio primero: si falta quién o el estado es inválido, la compra no se toca.
    const cambio = new CambioEstadoCompra(nuevoEstado, quien, fechaHora);
    if (!this.puedePasarA(nuevoEstado)) {
      throw new ConflictError(`No se puede pasar una compra de ${this.estado} a ${nuevoEstado}`);
    }
    if (ocupaCupo(this.estado) && !ocupaCupo(nuevoEstado)) {
      this.tipoEntrada.liberar(this.cantidad);
    }
    this.estado = nuevoEstado;
    this.historial.push(cambio);
  }

  cancelar(quien, ahora = new Date()) {
    if (!this.comprador.esElMismo(quien)) {
      throw new ForbiddenError("Solo el comprador puede cancelar la compra");
    }
    if (this.estaUtilizada()) {
      throw new ConflictError("No se puede cancelar una compra utilizada");
    }
    if (this.evento.yaPaso(ahora)) {
      throw new ConflictError("No se puede cancelar una compra de un evento que ya se realizó");
    }
    const estabaConfirmada = this.estaConfirmada();
    this.actualizarEstado(estadoCompra.CANCELADA, quien, ahora);
    if (estabaConfirmada) {
      this.actualizarEstado(estadoCompra.REEMBOLSADA, quien, ahora);
    }
  }

  // El comprador paga una compra PENDIENTE (pago simulado) y queda CONFIRMADA. Una compra nueva ya se confirma al
  // comprar; esto destraba las que quedaron pendientes. No se paga un evento que ya se realizó.
  pagar(quien, ahora = new Date()) {
    if (!this.comprador.esElMismo(quien)) {
      throw new ForbiddenError("Solo el comprador puede pagar la compra");
    }
    if (this.evento.yaPaso(ahora)) {
      throw new ConflictError("No se puede pagar una compra de un evento que ya se realizó");
    }
    this.actualizarEstado(estadoCompra.CONFIRMADA, quien, ahora);
  }

  // El organizador la marca al dejar entrar al comprador; solo se usa una compra confirmada.
  marcarUtilizada(quien, ahora = new Date()) {
    if (!this.evento.esOrganizador(quien)) {
      throw new ForbiddenError("Solo el organizador del evento puede marcar la compra como utilizada");
    }
    this.actualizarEstado(estadoCompra.UTILIZADA, quien, ahora);
  }

  // Días de calendario que faltan para el evento (0 = es hoy), solo para compras confirmadas de eventos que
  // todavía no se realizaron; si no, null. Se cuentan fechas y no horas: un evento de mañana a las 00:30 está
  // a 1 día aunque falten 3 horas, y uno de hoy a la noche, a 0. Math.round absorbe un posible cambio de horario.
  diasRestantes(ahora = new Date()) {
    if (!this.estaConfirmada() || this.evento.yaPaso(ahora)) return null;
    return Math.round((inicioDelDia(this.evento.fecha) - inicioDelDia(ahora)) / MS_POR_DIA);
  }

  esParticipante(usuario) {
    return this.comprador.esElMismo(usuario) || this.evento.esOrganizador(usuario);
  }

  agregarMensaje(usuario, texto, ahora = new Date()) {
    if (!this.esParticipante(usuario)) {
      throw new ForbiddenError(
        "Solo el comprador y el organizador del evento pueden escribir en este chat",
      );
    }
    const mensaje = new Mensaje(usuario, texto, ahora);
    this.mensajes.push(mensaje);
    return mensaje;
  }
}
