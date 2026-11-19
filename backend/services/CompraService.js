import { estadoCompra } from "../domain/EstadoCompra.js";
import { rolUsuario } from "../domain/RolUsuario.js";
import { Compra } from "../domain/Compra.js";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../errors/AppError.js";
import { compraRepository } from "../repositories/CompraRepository.js";
import { eventoRepository } from "../repositories/EventoRepository.js";
import { resenaRepository } from "../repositories/ResenaRepository.js";
import { usuarioRepository } from "../repositories/UsuarioRepository.js";

export class CompraService {
  // `ahora` es un reloj inyectable para poder probar sin depender de la fecha real.
  constructor(
    repositorioDeCompras = compraRepository,
    repositorioDeEventos = eventoRepository,
    repositorioDeUsuarios = usuarioRepository,
    ahora = () => new Date(),
    repositorioDeResenias = resenaRepository,
  ) {
    this.compraRepository = repositorioDeCompras;
    this.eventoRepository = repositorioDeEventos;
    this.usuarioRepository = repositorioDeUsuarios;
    this.ahora = ahora;
    this.resenaRepository = repositorioDeResenias;
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

  // Solo el comprador y el organizador del evento ven la compra (mismo criterio que el chat).
  // Además de lo de la lista trae el comprador, el organizador, si el evento ya pasó y la reseña (o null).
  async obtenerPorId(usuarioId, compraId) {
    const usuario = await this.buscarUsuario(usuarioId);
    const compra = await this.buscarCompra(compraId);
    if (!compra.esParticipante(usuario)) {
      throw new ForbiddenError("Solo el comprador y el organizador del evento pueden ver esta compra");
    }

    const ahora = this.ahora();
    const resenia = await this.resenaRepository.findByCompraId(compra.id);
    const respuesta = this.toCompraResponse(compra, ahora);
    const { organizador } = compra.evento;

    return {
      ...respuesta,
      evento: {
        ...respuesta.evento,
        yaPaso: compra.evento.yaPaso(ahora),
        organizador: { id: organizador.id, nombre: organizador.nombre, apellido: organizador.apellido },
      },
      // Solo nombre y apellido: nunca el email ni el hash del comprador.
      comprador: {
        id: compra.comprador.id,
        nombre: compra.comprador.nombre,
        apellido: compra.comprador.apellido,
      },
      resenia: resenia
        ? {
            id: resenia.id,
            puntuacion: resenia.puntuacion,
            detalle: resenia.detalle,
            fecha: resenia.fecha.toISOString(),
          }
        : null,
    };
  }

  // El comprador cancela su compra: si estaba CONFIRMADA se reembolsa enseguida (reembolso simulado).
  async cancelar(usuarioId, compraId) {
    return this.cambiarEstado(usuarioId, compraId, (compra, usuario, ahora) => compra.cancelar(usuario, ahora));
  }

  // El organizador del evento la marca como utilizada, por ejemplo al dejar entrar al comprador.
  async utilizar(usuarioId, compraId) {
    return this.cambiarEstado(usuarioId, compraId, (compra, usuario, ahora) =>
      compra.marcarUtilizada(usuario, ahora),
    );
  }

  // Las reglas (quién puede, desde qué estado, cupo) las decide el dominio; acá solo se busca y se guarda.
  async cambiarEstado(usuarioId, compraId, accion) {
    const usuario = await this.buscarUsuario(usuarioId);
    const compra = await this.buscarCompra(compraId);

    const ahora = this.ahora();
    accion(compra, usuario, ahora);

    const guardada = await this.compraRepository.save(compra);
    return this.toCompraResponse(guardada, ahora);
  }

  // Solo el comprador y el organizador del evento pueden leer el chat de la compra.
  async leerMensajes(usuarioId, compraId) {
    const usuario = await this.buscarUsuario(usuarioId);
    const compra = await this.buscarCompra(compraId);
    if (!compra.esParticipante(usuario)) {
      throw new ForbiddenError("Solo el comprador y el organizador del evento pueden ver este chat");
    }

    return compra.mensajes.map((mensaje) => this.toMensajeResponse(compra, mensaje));
  }

  // El dominio decide quién puede escribir (403) y que el texto no esté vacío (400).
  async enviarMensaje(usuarioId, compraId, texto) {
    const usuario = await this.buscarUsuario(usuarioId);
    const compra = await this.buscarCompra(compraId);

    const mensaje = compra.agregarMensaje(usuario, texto, this.ahora());
    await this.compraRepository.save(compra);

    return this.toMensajeResponse(compra, mensaje);
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

  async buscarCompra(compraId) {
    const compra = await this.compraRepository.findById(compraId);
    if (!compra) {
      throw new NotFoundError("La compra no existe");
    }
    return compra;
  }

  // El rol es el que tiene en esta compra (comprador u organizador del evento), no sus roles de usuario.
  // Nunca expone el email ni el hash del autor.
  toMensajeResponse(compra, mensaje) {
    const autor = mensaje.usuario;
    return {
      autor: {
        id: autor.id,
        nombre: autor.nombre,
        apellido: autor.apellido,
        rol: compra.comprador.esElMismo(autor) ? rolUsuario.COMPRADOR : rolUsuario.ORGANIZADOR,
      },
      mensaje: mensaje.mensaje,
      enviado: mensaje.enviado.toISOString(),
    };
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
