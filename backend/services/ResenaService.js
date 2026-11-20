import { Resenia } from "../domain/Resenia.js";
import { calcularPuntaje } from "../domain/Puntaje.js";
import { rolUsuario } from "../domain/RolUsuario.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../errors/AppError.js";
import { compraRepository } from "../repositories/CompraRepository.js";
import { eventoRepository } from "../repositories/EventoRepository.js";
import { resenaRepository } from "../repositories/ResenaRepository.js";
import { usuarioRepository } from "../repositories/UsuarioRepository.js";
import { rutaDeFoto } from "./fotos.js";

export class ResenaService {
  // `ahora` es un reloj inyectable para poder probar sin depender de la fecha real.
  constructor(
    repositorioDeResenias = resenaRepository,
    repositorioDeCompras = compraRepository,
    repositorioDeEventos = eventoRepository,
    repositorioDeUsuarios = usuarioRepository,
    ahora = () => new Date(),
  ) {
    this.resenaRepository = repositorioDeResenias;
    this.compraRepository = repositorioDeCompras;
    this.eventoRepository = repositorioDeEventos;
    this.usuarioRepository = repositorioDeUsuarios;
    this.ahora = ahora;
  }

  async resenar(usuarioId, compraId, { puntuacion, detalle }) {
    // Los datos viven en memoria: si el servidor se reinició, el token puede ser de un usuario que ya no existe.
    const usuario = await this.usuarioRepository.findById(usuarioId);
    if (!usuario) {
      throw new UnauthorizedError("La sesión ya no es válida, iniciá sesión de nuevo");
    }
    const compra = await this.compraRepository.findById(compraId);
    if (!compra) {
      throw new NotFoundError("La compra no existe");
    }

    // El dominio exige que el autor sea el comprador (403), que la compra esté UTILIZADA (409)
    // y que la puntuación y el comentario sean válidos (400). Va antes de buscar la reseña previa
    // para que un usuario ajeno reciba 403 y no se entere de si la compra ya tiene reseña.
    const resenia = new Resenia(compra, usuario, puntuacion, detalle, this.ahora());
    if (await this.resenaRepository.findByCompraId(compra.id)) {
      throw new ConflictError("Esta compra ya tiene una reseña");
    }

    return this.toReseniaResponse(await this.resenaRepository.save(resenia));
  }

  async listarDeEvento(eventoId) {
    const evento = await this.eventoRepository.findById(eventoId);
    if (!evento) {
      throw new NotFoundError("El evento no existe");
    }
    const resenias = await this.resenaRepository.findByEventoId(evento.id);
    const delOrganizador = await this.resenaRepository.findByOrganizadorId(evento.organizador.id);

    return {
      evento: { id: evento.id, nombre: evento.nombre },
      // No hay puntaje por evento: el puntaje es del organizador, con todas las reseñas de sus eventos.
      organizador: {
        id: evento.organizador.id,
        nombre: evento.organizador.nombre,
        apellido: evento.organizador.apellido,
        foto: rutaDeFoto(evento.organizador),
        puntaje: calcularPuntaje(delOrganizador),
      },
      resenias: resenias.map((resenia) => this.toReseniaResponse(resenia)),
    };
  }

  async listarDeOrganizador(organizadorId) {
    const organizador = await this.usuarioRepository.findById(organizadorId);
    if (!organizador || !organizador.tieneRol(rolUsuario.ORGANIZADOR)) {
      throw new NotFoundError("El organizador no existe");
    }
    const resenias = await this.resenaRepository.findByOrganizadorId(organizador.id);

    return {
      organizador: {
        id: organizador.id,
        nombre: organizador.nombre,
        apellido: organizador.apellido,
        foto: rutaDeFoto(organizador),
        puntaje: calcularPuntaje(resenias),
        cantidadResenias: resenias.length,
      },
      resenias: resenias.map((resenia) => this.toReseniaResponse(resenia)),
    };
  }

  // Nunca expone el email ni el hash del autor.
  toReseniaResponse(resenia) {
    return {
      id: resenia.id,
      puntuacion: resenia.puntuacion,
      detalle: resenia.detalle,
      fecha: resenia.fecha.toISOString(),
      autor: {
        id: resenia.comprador.id,
        nombre: resenia.comprador.nombre,
        apellido: resenia.comprador.apellido,
        foto: rutaDeFoto(resenia.comprador),
      },
      evento: { id: resenia.evento.id, nombre: resenia.evento.nombre },
    };
  }
}
