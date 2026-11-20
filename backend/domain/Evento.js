import { ConflictError, ForbiddenError, ValidationError } from "../errors/AppError.js";
import { tipoDeImagen } from "./Imagen.js";
import { rolUsuario } from "./RolUsuario.js";
import { TipoEntrada } from "./TipoEntrada.js";

// Imágenes del evento: URLs (las del seed o las que se cargan a mano) y fotos adjuntas desde la app, todas juntas
// en `multimedia`. La app achica cada foto a 1080 px de lado (unos 150 KB), así que 400 KB dejan margen.
export const MAXIMO_DE_IMAGENES = 6;
export const TAMANIO_MAXIMO_DE_IMAGEN = 400 * 1024;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Medianoche del mismo día, en la hora local del servidor.
function inicioDelDia(fecha) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  return inicio.getTime();
}

export class Evento {
  id;
  nombre;
  descripcion;
  categoria;
  fecha;
  organizador;
  tiposEntrada;
  multimedia; // String[]: URLs y rutas de las imágenes adjuntas, en el orden en que se muestran
  imagenes; // [{ id, tipo, datos (Buffer) }]: los bytes de las imágenes adjuntas
  cancelado;

  constructor(nombre, descripcion, categoria, fecha, organizador, tiposEntrada, multimedia = []) {
    validarNombre(nombre);
    validarCategoria(categoria);
    validarFecha(fecha);
    if (!organizador) {
      throw new ValidationError("El evento debe tener un organizador");
    }
    if (!organizador.tieneRol(rolUsuario.ORGANIZADOR)) {
      throw new ForbiddenError("Solo un usuario organizador puede crear eventos");
    }
    if (!Array.isArray(tiposEntrada) || tiposEntrada.length === 0) {
      throw new ValidationError("El evento debe tener al menos un tipo de entrada");
    }
    if (tiposEntrada.some((tipo) => !(tipo instanceof TipoEntrada))) {
      throw new ValidationError("Los tipos de entrada del evento no son válidos");
    }
    validarNombresDeTipos(tiposEntrada.map((tipo) => tipo.nombre));
    validarMultimedia(multimedia);

    this.nombre = nombre;
    this.descripcion = descripcion;
    this.categoria = categoria;
    this.fecha = fecha;
    this.organizador = organizador;
    this.tiposEntrada = [...tiposEntrada];
    this.multimedia = [...multimedia];
    this.imagenes = [];
    this.cancelado = false;
  }

  // El organizador adjunta una imagen (bytes de un JPEG o PNG) a un evento próximo. Se guarda con el id que le da
  // el service y su ruta se suma al final de `multimedia`, que sigue siendo una lista de textos como en el diagrama.
  agregarImagen(datos, imagenId, quien, ahora = new Date()) {
    this.#exigirGestionable(quien, "agregarle imágenes", ahora);
    if (!Buffer.isBuffer(datos) || datos.length === 0) {
      throw new ValidationError("Hay que mandar una imagen");
    }
    if (datos.length > TAMANIO_MAXIMO_DE_IMAGEN) {
      throw new ValidationError(`La imagen no puede superar los ${TAMANIO_MAXIMO_DE_IMAGEN / 1024} KB`);
    }
    const tipo = tipoDeImagen(datos);
    if (!tipo) {
      throw new ValidationError("La imagen tiene que ser un JPEG o un PNG");
    }
    if (this.multimedia.length >= MAXIMO_DE_IMAGENES) {
      throw new ConflictError(`El evento ya tiene ${MAXIMO_DE_IMAGENES} imágenes, que es el máximo`);
    }
    this.imagenes.push({ id: imagenId, tipo, datos });
    this.multimedia.push(this.rutaDeImagen(imagenId));
  }

  // { tipo, datos } de una imagen adjunta, o null si no existe (o se quitó al editar).
  imagen(imagenId) {
    const imagen = this.imagenes.find(({ id }) => id === imagenId);
    return imagen ? { tipo: imagen.tipo, datos: imagen.datos } : null;
  }

  // La ruta pública de una imagen adjunta, relativa al servidor (la app le antepone la dirección).
  rutaDeImagen(imagenId) {
    return `/eventos/${this.id}/imagenes/${imagenId}`;
  }

  #exigirGestionable(quien, accion, ahora) {
    if (!this.esOrganizador(quien)) {
      throw new ForbiddenError(`Solo el organizador del evento puede ${accion}`);
    }
    if (this.cancelado) {
      throw new ConflictError(`No se puede ${accion} a un evento cancelado`);
    }
    if (this.yaPaso(ahora)) {
      throw new ConflictError(`No se puede ${accion} a un evento que ya se realizó`);
    }
  }

  // El organizador cancela un evento próximo. Las compras las resuelve cada `Compra` (cancelarPorEvento).
  cancelar(quien, ahora = new Date()) {
    if (!this.esOrganizador(quien)) {
      throw new ForbiddenError("Solo el organizador del evento puede cancelarlo");
    }
    if (this.cancelado) {
      throw new ConflictError("El evento ya está cancelado");
    }
    if (this.yaPaso(ahora)) {
      throw new ConflictError("No se puede cancelar un evento que ya se realizó");
    }
    this.cancelado = true;
  }

  // El organizador edita un evento próximo. Solo cambia lo que viene en `datos`; `tiposEntrada`, si viene, es la
  // lista completa: con `id` edita un tipo existente, sin `id` agrega uno nuevo y los existentes que faltan se quitan.
  // Un tipo con entradas vendidas no se quita ni cambia de precio, y su cupo no baja de lo vendido.
  // Todo se valida antes de modificar: si algo falla, el evento queda como estaba.
  editar({ nombre, descripcion, categoria, fecha, multimedia, tiposEntrada }, quien, ahora = new Date()) {
    if (!this.esOrganizador(quien)) {
      throw new ForbiddenError("Solo el organizador del evento puede editarlo");
    }
    if (this.cancelado) {
      throw new ConflictError("No se puede editar un evento cancelado");
    }
    if (this.yaPaso(ahora)) {
      throw new ConflictError("No se puede editar un evento que ya se realizó");
    }
    if (nombre !== undefined) validarNombre(nombre);
    if (categoria !== undefined) validarCategoria(categoria);
    if (fecha !== undefined) {
      validarFecha(fecha);
      if (fecha.getTime() <= ahora.getTime()) {
        throw new ValidationError("La fecha del evento debe ser futura");
      }
    }
    if (multimedia !== undefined) {
      validarMultimedia(multimedia);
      this.#validarImagenesPropias(multimedia);
    }
    const nuevosTipos = tiposEntrada === undefined ? null : this.planificarTipos(tiposEntrada);

    if (nombre !== undefined) this.nombre = nombre;
    if (descripcion !== undefined) this.descripcion = descripcion;
    if (categoria !== undefined) this.categoria = categoria;
    if (fecha !== undefined) this.fecha = fecha;
    if (multimedia !== undefined) {
      this.multimedia = [...multimedia];
      // Los bytes de las imágenes adjuntas que ya no están en la lista se descartan.
      this.imagenes = this.imagenes.filter(({ id }) => this.multimedia.includes(this.rutaDeImagen(id)));
    }
    if (nuevosTipos) {
      nuevosTipos.forEach(({ tipo, datos }) => datos && tipo.editar(datos));
      this.tiposEntrada = nuevosTipos.map(({ tipo }) => tipo);
    }
  }

  // Al editar, una ruta (lo que no es una URL) solo puede ser de una imagen adjunta de este mismo evento: así no se
  // puede "conservar" una imagen que no existe ni una de otro evento.
  #validarImagenesPropias(multimedia) {
    const rutasPropias = this.imagenes.map(({ id }) => this.rutaDeImagen(id));
    if (multimedia.some((url) => url.startsWith("/") && !rutasPropias.includes(url))) {
      throw new ValidationError("Una de las imágenes no pertenece al evento");
    }
  }

  // Valida la lista nueva de tipos y devuelve qué hacer con cada uno, sin modificar nada todavía.
  planificarTipos(tiposEntrada) {
    if (!Array.isArray(tiposEntrada) || tiposEntrada.length === 0) {
      throw new ValidationError("El evento debe tener al menos un tipo de entrada");
    }
    const ids = new Set();
    const plan = tiposEntrada.map((datos) => {
      if (datos.id === undefined) {
        return { tipo: new TipoEntrada(datos.nombre, datos.descripcion ?? "", datos.precio, datos.cupo), datos: null };
      }
      const tipo = this.tiposEntrada.find((existente) => existente.id === datos.id);
      if (!tipo || ids.has(datos.id)) {
        throw new ValidationError("El tipo de entrada no pertenece al evento");
      }
      ids.add(datos.id);
      tipo.validarEdicion(datos);
      return { tipo, datos };
    });

    const quitadoConVentas = this.tiposEntrada.find((tipo) => !ids.has(tipo.id) && tipo.tieneVentas());
    if (quitadoConVentas) {
      throw new ConflictError(`No se puede quitar ${quitadoConVentas.nombre}: ya tiene entradas vendidas`);
    }
    validarNombresDeTipos(plan.map(({ tipo, datos }) => datos?.nombre ?? tipo.nombre));
    return plan;
  }

  tuPrecioEstaEntre(min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      throw new ValidationError("El rango de precios no es válido");
    }
    return this.tiposEntrada.some((tipo) => tipo.precio >= min && tipo.precio <= max);
  }

  precioMinimo() {
    return Math.min(...this.tiposEntrada.map((tipo) => tipo.precio));
  }

  yaPaso(ahora = new Date()) {
    return this.fecha.getTime() <= ahora.getTime();
  }

  // Días de calendario que faltan para el evento (0 = es hoy), o null si ya se realizó. Se cuentan fechas y no
  // horas: un evento de mañana a las 00:30 está a 1 día aunque falten 3 horas, y uno de hoy a la noche, a 0.
  // Math.round absorbe un posible cambio de horario. Un evento cancelado también cuenta: la marca la pone quien muestra.
  diasRestantes(ahora = new Date()) {
    if (this.yaPaso(ahora)) return null;
    return Math.round((inicioDelDia(this.fecha) - inicioDelDia(ahora)) / MS_POR_DIA);
  }

  tieneTipoEntrada(tipoEntrada) {
    return this.tiposEntrada.includes(tipoEntrada);
  }

  esOrganizador(usuario) {
    return this.organizador.esElMismo(usuario);
  }

  // Cada palabra buscada tiene que aparecer en el nombre o en la descripción,
  // sin importar mayúsculas ni tildes. Un texto vacío coincide con todos los eventos.
  coincideConTexto(texto) {
    const palabras = normalizar(texto).split(" ").filter(Boolean);
    const contenido = normalizar(`${this.nombre} ${this.descripcion ?? ""}`);
    return palabras.every((palabra) => contenido.includes(palabra));
  }

  perteneceACategoria(categoriaId) {
    return this.categoria.id === categoriaId;
  }

  // Por id, para filtrar el catálogo; `esOrganizador` recibe la entidad y sirve para autorizar.
  esDelOrganizador(organizadorId) {
    return this.organizador.id === organizadorId;
  }
}

function validarNombre(nombre) {
  if (typeof nombre !== "string" || !nombre.trim()) {
    throw new ValidationError("El evento debe tener un nombre");
  }
}

function validarCategoria(categoria) {
  if (!categoria) {
    throw new ValidationError("El evento debe tener una categoría");
  }
}

function validarFecha(fecha) {
  if (!(fecha instanceof Date) || isNaN(fecha)) {
    throw new ValidationError("La fecha del evento debe ser una fecha válida");
  }
}

function validarNombresDeTipos(nombres) {
  const normalizados = nombres.map((nombre) => nombre.toLowerCase());
  if (new Set(normalizados).size !== normalizados.length) {
    throw new ValidationError("El evento no puede tener dos tipos de entrada con el mismo nombre");
  }
}

function validarMultimedia(multimedia) {
  if (!Array.isArray(multimedia) || multimedia.some((url) => typeof url !== "string" || !url.trim())) {
    throw new ValidationError("La multimedia del evento debe ser una lista de URLs");
  }
  if (multimedia.length > MAXIMO_DE_IMAGENES) {
    throw new ValidationError(`El evento puede tener hasta ${MAXIMO_DE_IMAGENES} imágenes`);
  }
}

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}
