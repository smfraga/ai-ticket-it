import { Evento } from "../domain/Evento.js";
import { calcularPuntaje } from "../domain/Puntaje.js";
import { TipoEntrada } from "../domain/TipoEntrada.js";
import { NotFoundError, UnauthorizedError, ValidationError } from "../errors/AppError.js";
import { categoriaRepository } from "../repositories/CategoriaRepository.js";
import { eventoRepository } from "../repositories/EventoRepository.js";
import { resenaRepository } from "../repositories/ResenaRepository.js";
import { usuarioRepository } from "../repositories/UsuarioRepository.js";

const PRECIO_MAXIMO = Number.MAX_SAFE_INTEGER;

export class EventoService {
  // `ahora` es un reloj inyectable para poder probar sin depender de la fecha real.
  constructor(
    repositorioDeEventos = eventoRepository,
    repositorioDeCategorias = categoriaRepository,
    repositorioDeUsuarios = usuarioRepository,
    repositorioDeResenias = resenaRepository,
    ahora = () => new Date(),
  ) {
    this.eventoRepository = repositorioDeEventos;
    this.categoriaRepository = repositorioDeCategorias;
    this.usuarioRepository = repositorioDeUsuarios;
    this.resenaRepository = repositorioDeResenias;
    this.ahora = ahora;
  }

  async crear(usuarioId, datos) {
    // Los datos viven en memoria: si el servidor se reinició, el token puede ser de un usuario que ya no existe.
    const organizador = await this.usuarioRepository.findById(usuarioId);
    if (!organizador) {
      throw new UnauthorizedError("La sesión ya no es válida, iniciá sesión de nuevo");
    }

    const categoria = await this.categoriaRepository.findById(datos.categoriaId);
    if (!categoria) {
      throw new NotFoundError("La categoría no existe");
    }

    const ahora = this.ahora();
    if (datos.fecha.getTime() <= ahora.getTime()) {
      throw new ValidationError("La fecha del evento debe ser futura");
    }

    const tiposEntrada = datos.tiposEntrada.map(
      (tipo) => new TipoEntrada(tipo.nombre, tipo.descripcion ?? "", tipo.precio, tipo.cupo),
    );
    // El dominio exige que el usuario tenga rol ORGANIZADOR (403 si no lo tiene).
    const evento = new Evento(
      datos.nombre,
      datos.descripcion ?? "",
      categoria,
      datos.fecha,
      organizador,
      tiposEntrada,
      datos.multimedia ?? [],
    );

    const guardado = await this.eventoRepository.save(evento);
    const puntaje = await this.puntajeDelOrganizador(organizador.id);

    return this.toEventoResponse(guardado, puntaje, ahora);
  }

  async buscar({
    texto,
    categoriaId,
    precioMin,
    precioMax,
    periodo = "proximos",
    orden = "fecha",
    direccion,
  } = {}) {
    const ahora = this.ahora();
    const todos = await this.eventoRepository.findAll();

    const hayRangoDePrecio = precioMin !== undefined || precioMax !== undefined;
    const eventos = todos.filter(
      (evento) =>
        (periodo === "todos" || (periodo === "pasados") === evento.yaPaso(ahora)) &&
        evento.coincideConTexto(texto) &&
        (categoriaId === undefined || evento.perteneceACategoria(categoriaId)) &&
        (!hayRangoDePrecio || evento.tuPrecioEstaEntre(precioMin ?? 0, precioMax ?? PRECIO_MAXIMO)),
    );

    const puntajes = await this.puntajesDeLosOrganizadores(eventos);
    const sentido = direccion ?? (orden === "puntaje" ? "desc" : "asc");

    return eventos
      .sort(compararEventos(orden, sentido, puntajes))
      .map((evento) => this.toEventoResponse(evento, puntajes.get(evento.organizador.id), ahora));
  }

  async getById(id) {
    const evento = await this.eventoRepository.findById(id);
    if (!evento) {
      throw new NotFoundError("El evento no existe");
    }
    const puntaje = await this.puntajeDelOrganizador(evento.organizador.id);

    return this.toEventoResponse(evento, puntaje, this.ahora());
  }

  async puntajeDelOrganizador(organizadorId) {
    return calcularPuntaje(await this.resenaRepository.findByOrganizadorId(organizadorId));
  }

  // Calcula el puntaje una sola vez por organizador, aunque tenga muchos eventos.
  async puntajesDeLosOrganizadores(eventos) {
    const puntajes = new Map();
    for (const { organizador } of eventos) {
      if (!puntajes.has(organizador.id)) {
        puntajes.set(organizador.id, await this.puntajeDelOrganizador(organizador.id));
      }
    }
    return puntajes;
  }

  // Nunca expone el email ni el hash del organizador.
  toEventoResponse(evento, puntaje, ahora) {
    return {
      id: evento.id,
      nombre: evento.nombre,
      descripcion: evento.descripcion ?? "",
      categoria: { id: evento.categoria.id, nombre: evento.categoria.nombre },
      fecha: evento.fecha.toISOString(),
      multimedia: evento.multimedia,
      organizador: {
        id: evento.organizador.id,
        nombre: evento.organizador.nombre,
        apellido: evento.organizador.apellido,
        puntaje,
      },
      precioDesde: evento.precioMinimo(),
      yaPaso: evento.yaPaso(ahora),
      tiposEntrada: evento.tiposEntrada.map((tipo) => ({
        id: tipo.id,
        nombre: tipo.nombre,
        descripcion: tipo.descripcion ?? "",
        precio: tipo.precio,
        cupo: tipo.cupo,
        disponibles: tipo.disponibles(),
      })),
    };
  }
}

function compararEventos(orden, sentido, puntajes) {
  const factor = sentido === "desc" ? -1 : 1;

  const porOrden = {
    fecha: (a, b) => (a.fecha.getTime() - b.fecha.getTime()) * factor,
    precio: (a, b) => (a.precioMinimo() - b.precioMinimo()) * factor,
    puntaje: (a, b) => {
      const puntajeA = puntajes.get(a.organizador.id);
      const puntajeB = puntajes.get(b.organizador.id);
      // Los organizadores sin puntaje van al final, en cualquier sentido.
      if (puntajeA === null && puntajeB === null) return 0;
      if (puntajeA === null) return 1;
      if (puntajeB === null) return -1;
      return (puntajeA - puntajeB) * factor;
    },
  }[orden];

  // Desempate fijo (no depende del sentido): fecha y después nombre.
  return (a, b) =>
    porOrden(a, b) ||
    a.fecha.getTime() - b.fecha.getTime() ||
    a.nombre.localeCompare(b.nombre, "es");
}
