import { ConflictError, ForbiddenError, ValidationError } from "../errors/AppError.js";
import { CambioEstadoCompra } from "./CambioEstadoCompra.js";
import { estadoCompra, transicionesCompra } from "./EstadoCompra.js";
import { Mensaje } from "./Mensaje.js";
import { rolUsuario } from "./RolUsuario.js";
import { USUARIO_SISTEMA } from "./UsuarioSistema.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Una compra PENDIENTE tiene este plazo para pagarse (o hasta que empiece el evento, si es antes).
export const PLAZO_DE_PAGO_DIAS = 7;

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
  lecturas

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
    if (evento.cancelado) {
      throw new ConflictError("No se pueden comprar entradas de un evento cancelado");
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
    // Última vez que cada participante leyó el chat (id del usuario → fecha), para contar los mensajes nuevos.
    this.lecturas = new Map();
  }

  estaConfirmada() {
    return this.estado === estadoCompra.CONFIRMADA;
  }

  estaUtilizada() {
    return this.estado === estadoCompra.UTILIZADA;
  }

  // Pendiente de pago o confirmada: la compra sigue en pie para el evento (se le avisan los cambios).
  estaActiva() {
    return this.estado === estadoCompra.PENDIENTE || this.estaConfirmada();
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

  // El organizador canceló el evento: una compra confirmada se reembolsa (CANCELADA y enseguida REEMBOLSADA) y una
  // pendiente queda CANCELADA, con el organizador como responsable. Las demás no cambian (una cancelada o reembolsada
  // ya liberó el cupo). Devuelve si la compra cambió.
  cancelarPorEvento(quien, ahora = new Date()) {
    if (!this.evento.esOrganizador(quien)) {
      throw new ForbiddenError("Solo el organizador del evento puede cancelar sus compras");
    }
    if (!this.estaActiva()) return false;
    const estabaConfirmada = this.estaConfirmada();
    this.actualizarEstado(estadoCompra.CANCELADA, quien, ahora);
    if (estabaConfirmada) {
      this.actualizarEstado(estadoCompra.REEMBOLSADA, quien, ahora);
    }
    return true;
  }

  // El comprador paga una compra PENDIENTE (pago simulado) y queda CONFIRMADA. Una compra nueva ya se confirma al
  // comprar; esto destraba las que quedaron pendientes. No se paga un evento que ya se realizó.
  pagar(quien, ahora = new Date()) {
    if (!this.comprador.esElMismo(quien)) {
      throw new ForbiddenError("Solo el comprador puede pagar la compra");
    }
    if (this.evento.cancelado) {
      throw new ConflictError("No se puede pagar una compra de un evento cancelado");
    }
    if (this.evento.yaPaso(ahora)) {
      throw new ConflictError("No se puede pagar una compra de un evento que ya se realizó");
    }
    // El vencimiento corre cada tanto: entre que vence y que se procesa, la compra sigue PENDIENTE pero ya no se paga.
    if (this.estaVencida(ahora)) {
      throw new ConflictError("Venció el plazo para pagar esta compra");
    }
    this.actualizarEstado(estadoCompra.CONFIRMADA, quien, ahora);
  }

  // Hasta cuándo se puede pagar una compra PENDIENTE: 7 días desde que se hizo o el inicio del evento, lo que
  // llegue primero (después del evento ya no se puede pagar). null si la compra no está pendiente.
  fechaLimiteDePago() {
    if (this.estado !== estadoCompra.PENDIENTE) return null;
    const porPlazo = this.historial[0].fechaHora.getTime() + PLAZO_DE_PAGO_DIAS * MS_POR_DIA;
    return new Date(Math.min(porPlazo, this.evento.fecha.getTime()));
  }

  estaVencida(ahora = new Date()) {
    const limite = this.fechaLimiteDePago();
    return limite !== null && ahora.getTime() >= limite.getTime();
  }

  // Si venció el plazo de pago, la plataforma la cancela sola (libera el cupo) y queda registrada como
  // responsable. Devuelve si la compra cambió.
  vencer(ahora = new Date()) {
    if (!this.estaVencida(ahora)) return false;
    this.actualizarEstado(estadoCompra.CANCELADA, USUARIO_SISTEMA, ahora);
    return true;
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
    // Quien escribe ya vio la conversación hasta acá.
    this.marcarLeido(usuario, ahora);
    return mensaje;
  }

  // El participante leyó el chat hasta `ahora`.
  marcarLeido(usuario, ahora = new Date()) {
    if (!this.esParticipante(usuario)) {
      throw new ForbiddenError("Solo el comprador y el organizador del evento pueden ver este chat");
    }
    this.lecturas.set(usuario.id, ahora);
  }

  // Mensajes de la otra parte enviados después de la última lectura de `usuario` (todos, si nunca lo leyó).
  // Los propios nunca cuentan. Quien no participa de la compra no tiene mensajes nuevos.
  mensajesNoLeidosPara(usuario) {
    if (!this.esParticipante(usuario)) return 0;
    const ultimaLectura = this.lecturas.get(usuario.id);
    return this.mensajes.filter(
      (mensaje) =>
        !mensaje.usuario.esElMismo(usuario) &&
        (ultimaLectura === undefined || mensaje.enviado.getTime() > ultimaLectura.getTime()),
    ).length;
  }
}
