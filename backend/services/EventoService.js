import { Evento } from "../domain/Evento.js";
import { calcularPuntaje } from "../domain/Puntaje.js";
import { TipoEntrada } from "../domain/TipoEntrada.js";
import { NotFoundError, UnauthorizedError, ValidationError } from "../errors/AppError.js";
import { categoriaRepository } from "../repositories/CategoriaRepository.js";
import { compraRepository } from "../repositories/CompraRepository.js";
import { eventoRepository } from "../repositories/EventoRepository.js";
import { resenaRepository } from "../repositories/ResenaRepository.js";
import { usuarioRepository } from "../repositories/UsuarioRepository.js";
import { LIMITE_POR_DEFECTO } from "../validations/paginacionValidation.js";
import { rutaDeFoto } from "./fotos.js";
import { formatearFecha, formatearPrecio } from "./formato.js";

const PRECIO_MAXIMO = Number.MAX_SAFE_INTEGER;

export class EventoService {
  // `ahora` es un reloj inyectable para poder probar sin depender de la fecha real.
  constructor(
    repositorioDeEventos = eventoRepository,
    repositorioDeCategorias = categoriaRepository,
    repositorioDeUsuarios = usuarioRepository,
    repositorioDeResenias = resenaRepository,
    ahora = () => new Date(),
    // Al final, para no romper a quien ya construye el service con los parámetros anteriores.
    repositorioDeCompras = compraRepository,
  ) {
    this.eventoRepository = repositorioDeEventos;
    this.categoriaRepository = repositorioDeCategorias;
    this.usuarioRepository = repositorioDeUsuarios;
    this.resenaRepository = repositorioDeResenias;
    this.ahora = ahora;
    this.compraRepository = repositorioDeCompras;
  }

  async crear(usuarioId, datos) {
    const organizador = await this.buscarUsuario(usuarioId);
    const categoria = await this.buscarCategoria(datos.categoriaId);

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

  // Las reglas (quién, cuándo, cupos y precios con ventas) las decide el dominio. Si cambió la fecha, cada compra
  // activa recibe un aviso en su chat, a nombre del organizador.
  async editar(usuarioId, eventoId, datos) {
    const organizador = await this.buscarUsuario(usuarioId);
    const evento = await this.buscarEvento(eventoId);
    const categoria = datos.categoriaId === undefined ? undefined : await this.buscarCategoria(datos.categoriaId);

    const ahora = this.ahora();
    const fechaAnterior = evento.fecha;
    evento.editar({ ...datos, categoria }, organizador, ahora);
    const guardado = await this.eventoRepository.save(evento);

    if (guardado.fecha.getTime() !== fechaAnterior.getTime()) {
      const aviso =
        `Cambiamos la fecha del evento: era el ${formatearFecha(fechaAnterior)} ` +
        `y ahora es el ${formatearFecha(guardado.fecha)}.`;
      await this.avisarALasComprasActivas(guardado, organizador, () => aviso, ahora);
    }

    const puntaje = await this.puntajeDelOrganizador(organizador.id);
    return this.toEventoResponse(guardado, puntaje, ahora);
  }

  // El dominio decide quién y cuándo (403, 409). Cada compra activa se cancela (o se reembolsa si estaba
  // confirmada) y recibe un aviso en su chat, a nombre del organizador.
  async cancelar(usuarioId, eventoId) {
    const organizador = await this.buscarUsuario(usuarioId);
    const evento = await this.buscarEvento(eventoId);

    const ahora = this.ahora();
    evento.cancelar(organizador, ahora);
    const guardado = await this.eventoRepository.save(evento);

    const compras = await this.compraRepository.findByEventoId(evento.id);
    for (const compra of compras) {
      const estabaConfirmada = compra.estaConfirmada();
      if (!compra.cancelarPorEvento(organizador, ahora)) continue;
      const aviso = estabaConfirmada
        ? `Cancelamos el evento. Te reintegramos ${formatearPrecio(compra.total)}.`
        : "Cancelamos el evento. Tu compra pendiente quedó cancelada.";
      compra.agregarMensaje(organizador, aviso, ahora);
      await this.compraRepository.save(compra);
    }

    const puntaje = await this.puntajeDelOrganizador(organizador.id);
    return this.toEventoResponse(guardado, puntaje, ahora);
  }

  async avisarALasComprasActivas(evento, organizador, textoPara, ahora) {
    const compras = await this.compraRepository.findByEventoId(evento.id);
    for (const compra of compras.filter((c) => c.estaActiva())) {
      compra.agregarMensaje(organizador, textoPara(compra), ahora);
      await this.compraRepository.save(compra);
    }
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

  async buscarCategoria(categoriaId) {
    const categoria = await this.categoriaRepository.findById(categoriaId);
    if (!categoria) {
      throw new NotFoundError("La categoría no existe");
    }
    return categoria;
  }

  async buscar({
    texto,
    categoriaId,
    organizadorId,
    precioMin,
    precioMax,
    periodo = "proximos",
    orden = "fecha",
    direccion,
  } = {}) {
    const ahora = this.ahora();
    const todos = await this.eventoRepository.findAll();

    const hayRangoDePrecio = precioMin !== undefined || precioMax !== undefined;
    // Los cancelados no se ofrecen en el catálogo, pero su organizador los sigue viendo en "Mis eventos".
    const eventos = todos.filter(
      (evento) =>
        (!evento.cancelado || organizadorId !== undefined) &&
        (periodo === "todos" || (periodo === "pasados") === evento.yaPaso(ahora)) &&
        evento.coincideConTexto(texto) &&
        (categoriaId === undefined || evento.perteneceACategoria(categoriaId)) &&
        (organizadorId === undefined || evento.esDelOrganizador(organizadorId)) &&
        (!hayRangoDePrecio || evento.tuPrecioEstaEntre(precioMin ?? 0, precioMax ?? PRECIO_MAXIMO)),
    );

    const puntajes = await this.puntajesDeLosOrganizadores(eventos);
    const sentido = direccion ?? (orden === "puntaje" ? "desc" : "asc");

    return eventos
      .sort(compararEventos(orden, sentido, puntajes))
      .map((evento) => this.toEventoResponse(evento, puntajes.get(evento.organizador.id), ahora));
  }

  // Una página del catálogo, con la forma de los listados paginados del TP grupal: `{ eventos, total, page, totalPages }`.
  // Se corta acá y no en el repositorio porque los filtros y el orden usan métodos del dominio (como `buscarPerfiles`
  // del grupo, que también filtra en memoria y pagina en el service).
  async buscarPaginado(page = 1, limit = LIMITE_POR_DEFECTO, filtros = {}) {
    const eventos = await this.buscar(filtros);
    const desde = (page - 1) * limit;

    return {
      eventos: eventos.slice(desde, desde + limit),
      total: eventos.length,
      page,
      totalPages: Math.ceil(eventos.length / limit),
    };
  }

  async getById(id) {
    const evento = await this.buscarEvento(id);
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
        foto: rutaDeFoto(evento.organizador),
        puntaje,
      },
      precioDesde: evento.precioMinimo(),
      yaPaso: evento.yaPaso(ahora),
      // Se calcula en el servidor para no depender del reloj del celular (igual que `diasRestantes` de la compra).
      diasParaElEvento: evento.diasRestantes(ahora),
      cancelado: evento.cancelado,
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
  return (a, b) => porOrden(a, b) || a.fecha.getTime() - b.fecha.getTime() || a.nombre.localeCompare(b.nombre, "es");
}
