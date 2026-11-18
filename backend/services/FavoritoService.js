import { NotFoundError, UnauthorizedError } from "../errors/AppError.js";
import { eventoRepository } from "../repositories/EventoRepository.js";
import { usuarioRepository } from "../repositories/UsuarioRepository.js";
import { EventoService } from "./EventoService.js";

export class FavoritoService {
  // `servicioDeEventos` arma la respuesta con el mismo formato del catálogo; `ahora` es un reloj inyectable.
  constructor(
    repositorioDeUsuarios = usuarioRepository,
    repositorioDeEventos = eventoRepository,
    servicioDeEventos = new EventoService(),
    ahora = () => new Date(),
  ) {
    this.usuarioRepository = repositorioDeUsuarios;
    this.eventoRepository = repositorioDeEventos;
    this.eventoService = servicioDeEventos;
    this.ahora = ahora;
  }

  // Devuelve `agregado: false` si el evento ya era favorito (no es un error).
  async guardar(usuarioId, eventoId) {
    const usuario = await this.buscarUsuario(usuarioId);
    const evento = await this.buscarEvento(eventoId);

    // El dominio exige el rol COMPRADOR (403).
    const agregado = usuario.agregarFavorito(evento);
    if (agregado) {
      await this.usuarioRepository.save(usuario);
    }

    const [respuesta] = await this.toEventosResponse([evento]);
    return { agregado, evento: respuesta };
  }

  // Quitar un evento que no era favorito tampoco es un error.
  async quitar(usuarioId, eventoId) {
    const usuario = await this.buscarUsuario(usuarioId);
    const evento = await this.buscarEvento(eventoId);

    if (usuario.quitarFavorito(evento)) {
      await this.usuarioRepository.save(usuario);
    }
  }

  async listar(usuarioId) {
    const usuario = await this.buscarUsuario(usuarioId);

    return this.toEventosResponse(usuario.listarFavoritos());
  }

  // Los datos viven en memoria: si el servidor se reinició, el token puede ser de un usuario que ya no existe.
  async buscarUsuario(usuarioId) {
    const usuario = await this.usuarioRepository.findById(usuarioId);
    if (!usuario) {
      throw new UnauthorizedError("La sesión ya no es válida, iniciá sesión de nuevo");
    }
    return usuario;
  }

  async buscarEvento(eventoId) {
    const evento = await this.eventoRepository.findById(eventoId);
    if (!evento) {
      throw new NotFoundError("El evento no existe");
    }
    return evento;
  }

  // Mismo formato que el catálogo (con `yaPaso`, el puntaje del organizador y los lugares disponibles).
  async toEventosResponse(eventos) {
    const ahora = this.ahora();
    const puntajes = await this.eventoService.puntajesDeLosOrganizadores(eventos);

    return eventos.map((evento) =>
      this.eventoService.toEventoResponse(evento, puntajes.get(evento.organizador.id), ahora),
    );
  }
}
