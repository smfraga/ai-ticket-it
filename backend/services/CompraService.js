import { estadoCompra } from "../domain/EstadoCompra.js";
import { Compra } from "../domain/Compra.js";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../errors/AppError.js";
import { compraRepository } from "../repositories/CompraRepository.js";
import { eventoRepository } from "../repositories/EventoRepository.js";
import { usuarioRepository } from "../repositories/UsuarioRepository.js";

export class CompraService {
  // `ahora` es un reloj inyectable para poder probar sin depender de la fecha real.
  constructor(
    repositorioDeCompras = compraRepository,
    repositorioDeEventos = eventoRepository,
    repositorioDeUsuarios = usuarioRepository,
    ahora = () => new Date(),
  ) {
    this.compraRepository = repositorioDeCompras;
    this.eventoRepository = repositorioDeEventos;
    this.usuarioRepository = repositorioDeUsuarios;
    this.ahora = ahora;
  }

  async comprar(usuarioId, eventoId, { tipoEntradaId, cantidad }) {
    const comprador = await this.buscarUsuario(usuarioId);

    const evento = await this.eventoRepository.findById(eventoId);
    if (!evento) {
      throw new NotFoundError("El evento no existe");
    }
    const tipoEntrada = evento.tiposEntrada.find((tipo) => tipo.id === tipoEntradaId);
    if (!tipoEntrada) {
      throw new NotFoundError("El tipo de entrada no existe en este evento");
    }

    const ahora = this.ahora();
    // El dominio exige rol COMPRADOR (403), evento futuro y cupo (409) y reserva las entradas.
    const compra = new Compra(comprador, evento, tipoEntrada, cantidad, ahora);
    // Pago simulado: la compra nace PENDIENTE y se confirma en el mismo request.
    compra.actualizarEstado(estadoCompra.CONFIRMADA, comprador, ahora);

    const guardada = await this.compraRepository.save(compra);
    return this.toCompraResponse(guardada, ahora);
  }

  async listarDelComprador(usuarioId) {
    const comprador = await this.buscarUsuario(usuarioId);
    const ahora = this.ahora();
    const compras = await this.compraRepository.findByCompradorId(comprador.id);

    return compras.map((compra) => this.toCompraResponse(compra, ahora));
  }

  async listarDeEvento(usuarioId, eventoId) {
    const usuario = await this.buscarUsuario(usuarioId);

    const evento = await this.eventoRepository.findById(eventoId);
    if (!evento) {
      throw new NotFoundError("El evento no existe");
    }
    if (!evento.esOrganizador(usuario)) {
      throw new ForbiddenError("Solo el organizador del evento puede ver sus compras");
    }

    const ahora = this.ahora();
    const compras = await this.compraRepository.findByEventoId(evento.id);

    return {
      evento: { id: evento.id, nombre: evento.nombre, fecha: evento.fecha.toISOString() },
      tiposEntrada: evento.tiposEntrada.map((tipo) => ({
        id: tipo.id,
        nombre: tipo.nombre,
        cupo: tipo.cupo,
        cupoRestante: tipo.disponibles(),
      })),
      compras: compras.map((compra) => ({
        ...this.toCompraResponse(compra, ahora),
        // Solo nombre y apellido: nunca el email ni el hash del comprador.
        comprador: {
          id: compra.comprador.id,
          nombre: compra.comprador.nombre,
          apellido: compra.comprador.apellido,
        },
      })),
    };
  }

  // Los datos viven en memoria: si el servidor se reinició, el token puede ser de un usuario que ya no existe.
  async buscarUsuario(usuarioId) {
    const usuario = await this.usuarioRepository.findById(usuarioId);
    if (!usuario) {
      throw new UnauthorizedError("La sesión ya no es válida, iniciá sesión de nuevo");
    }
    return usuario;
  }

  toCompraResponse(compra, ahora) {
    return {
      id: compra.id,
      estado: compra.estado,
      cantidad: compra.cantidad,
      total: compra.total,
      // Solo tiene valor si la compra está CONFIRMADA.
      diasRestantes: compra.diasRestantes(ahora),
      fecha: compra.historial[0].fechaHora.toISOString(),
      evento: { id: compra.evento.id, nombre: compra.evento.nombre, fecha: compra.evento.fecha.toISOString() },
      tipoEntrada: {
        id: compra.tipoEntrada.id,
        nombre: compra.tipoEntrada.nombre,
        precio: compra.tipoEntrada.precio,
        cupoRestante: compra.tipoEntrada.disponibles(),
      },
      historial: compra.historial.map((cambio) => ({
        estado: cambio.estado,
        fechaHora: cambio.fechaHora.toISOString(),
        quien: { id: cambio.quien.id, nombre: cambio.quien.nombre, apellido: cambio.quien.apellido },
      })),
    };
  }
}
