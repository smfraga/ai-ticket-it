import { ConflictError, ForbiddenError, ValidationError } from "../errors/AppError.js";
import { rolUsuario } from "./RolUsuario.js";
import { TipoEntrada } from "./TipoEntrada.js";

export class Evento {
  id;
  nombre;
  descripcion;
  categoria;
  fecha;
  organizador;
  tiposEntrada;
  multimedia;
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
    this.cancelado = false;
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
    if (multimedia !== undefined) validarMultimedia(multimedia);
    const nuevosTipos = tiposEntrada === undefined ? null : this.planificarTipos(tiposEntrada);

    if (nombre !== undefined) this.nombre = nombre;
    if (descripcion !== undefined) this.descripcion = descripcion;
    if (categoria !== undefined) this.categoria = categoria;
    if (fecha !== undefined) this.fecha = fecha;
    if (multimedia !== undefined) this.multimedia = [...multimedia];
    if (nuevosTipos) {
      nuevosTipos.forEach(({ tipo, datos }) => datos && tipo.editar(datos));
      this.tiposEntrada = nuevosTipos.map(({ tipo }) => tipo);
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
}

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}
