import {
  estadisticasDeComprador,
  estadisticasDeOrganizador,
  historialDeComprador,
  historialDeOrganizador,
} from "../domain/Estadisticas.js";
import { rolUsuario } from "../domain/RolUsuario.js";
import { NotFoundError, UnauthorizedError } from "../errors/AppError.js";
import { compraRepository } from "../repositories/CompraRepository.js";
import { eventoRepository } from "../repositories/EventoRepository.js";
import { resenaRepository } from "../repositories/ResenaRepository.js";
import { usuarioRepository } from "../repositories/UsuarioRepository.js";
import { toUsuarioResponse } from "./AuthService.js";

// El perfil del usuario logueado. Las reglas (qué se puede cambiar, cómo se calculan los números) son del dominio:
// `Usuario` y `Estadisticas`; acá solo se buscan los datos y se arma la respuesta.
export class PerfilService {
  // `ahora` es un reloj inyectable para poder probar sin depender de la fecha real.
  constructor(
    repositorioDeUsuarios = usuarioRepository,
    repositorioDeCompras = compraRepository,
    repositorioDeEventos = eventoRepository,
    repositorioDeResenias = resenaRepository,
    ahora = () => new Date(),
  ) {
    this.usuarioRepository = repositorioDeUsuarios;
    this.compraRepository = repositorioDeCompras;
    this.eventoRepository = repositorioDeEventos;
    this.resenaRepository = repositorioDeResenias;
    this.ahora = ahora;
  }

  // Los datos, las estadísticas y el historial, solo de los roles que tiene (el otro va en null).
  async obtener(usuarioId) {
    const usuario = await this.buscarUsuario(usuarioId);
    const ahora = this.ahora();
    return {
      usuario: toUsuarioResponse(usuario),
      comprador: usuario.tieneRol(rolUsuario.COMPRADOR) ? await this.comoComprador(usuario, ahora) : null,
      organizador: usuario.tieneRol(rolUsuario.ORGANIZADOR) ? await this.comoOrganizador(usuario, ahora) : null,
    };
  }

  async comoComprador(usuario, ahora) {
    const compras = await this.compraRepository.findByCompradorId(usuario.id);
    const resenias = await this.resenaRepository.findByCompradorId(usuario.id);
    const { proximoEvento, ...estadisticas } = estadisticasDeComprador(compras, resenias.length, ahora);
    return {
      estadisticas: { ...estadisticas, proximoEvento: proximoEvento ? this.toEventoResumen(proximoEvento) : null },
      historial: historialDeComprador(compras).map(({ evento, compras: delEvento }) => ({
        evento: this.toEventoResumen(evento),
        compras: delEvento.map((compra) => ({
          id: compra.id,
          cantidad: compra.cantidad,
          total: compra.total,
          tipoEntrada: { nombre: compra.tipoEntrada.nombre },
        })),
      })),
    };
  }

  async comoOrganizador(usuario, ahora) {
    const eventos = (await this.eventoRepository.findAll()).filter((evento) => evento.esDelOrganizador(usuario.id));
    const compras = (
      await Promise.all(eventos.map((evento) => this.compraRepository.findByEventoId(evento.id)))
    ).flat();
    const resenias = await this.resenaRepository.findByOrganizadorId(usuario.id);
    const { eventoMasVendido, ...estadisticas } = estadisticasDeOrganizador(eventos, compras, resenias, ahora);
    return {
      estadisticas: {
        ...estadisticas,
        eventoMasVendido: eventoMasVendido
          ? {
              evento: this.toEventoResumen(eventoMasVendido.evento),
              entradasVendidas: eventoMasVendido.entradasVendidas,
            }
          : null,
      },
      historial: historialDeOrganizador(eventos, compras, ahora).map(({ evento, ...ventas }) => ({
        evento: this.toEventoResumen(evento),
        ...ventas,
      })),
    };
  }

  toEventoResumen(evento) {
    return {
      id: evento.id,
      nombre: evento.nombre,
      fecha: evento.fecha.toISOString(),
      imagen: evento.multimedia?.[0] ?? null,
      categoria: evento.categoria.nombre,
    };
  }

  // Cambia nombre y apellido y devuelve el usuario como en la sesión. El token no cambia: solo lleva el id y los
  // roles, y ninguno de los dos se edita.
  async editar(usuarioId, datos) {
    const usuario = await this.buscarUsuario(usuarioId);
    usuario.cambiarNombre(datos);
    const guardado = await this.usuarioRepository.save(usuario);
    return toUsuarioResponse(guardado);
  }

  // `imagen` es un data URL ("data:image/jpeg;base64,...") ya validado por formato; el dominio decide si los bytes
  // son una imagen aceptable (tipo real y tamaño). Devuelve el usuario con la ruta nueva de su foto.
  async cambiarFoto(usuarioId, imagen) {
    const usuario = await this.buscarUsuario(usuarioId);
    const base64 = imagen.slice(imagen.indexOf(",") + 1);
    usuario.cambiarFoto(Buffer.from(base64, "base64"));
    return toUsuarioResponse(await this.usuarioRepository.save(usuario));
  }

  async quitarFoto(usuarioId) {
    const usuario = await this.buscarUsuario(usuarioId);
    usuario.quitarFoto();
    return toUsuarioResponse(await this.usuarioRepository.save(usuario));
  }

  // La foto de cualquier usuario (la ven los demás en el chat): { tipo, datos }. 404 si no existe o no tiene.
  async fotoDe(usuarioId) {
    const usuario = await this.usuarioRepository.findById(usuarioId);
    if (!usuario?.foto) {
      throw new NotFoundError("El usuario no tiene foto");
    }
    return { tipo: usuario.foto.tipo, datos: usuario.foto.datos };
  }

  // Los datos viven en memoria: si el servidor se reinició, el token puede ser de un usuario que ya no existe.
  async buscarUsuario(usuarioId) {
    const usuario = await this.usuarioRepository.findById(usuarioId);
    if (!usuario) {
      throw new UnauthorizedError("La sesión ya no es válida, iniciá sesión de nuevo");
    }
    return usuario;
  }
}
