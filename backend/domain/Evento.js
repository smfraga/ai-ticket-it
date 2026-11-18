import { ForbiddenError, ValidationError } from "../errors/AppError.js";
import { rolUsuario } from "./RolUsuario.js";
import { TipoEntrada } from "./TipoEntrada.js";

export class Evento {
  id
  nombre
  descripcion
  categoria
  fecha
  organizador
  tiposEntrada
  multimedia

  constructor(nombre, descripcion, categoria, fecha, organizador, tiposEntrada, multimedia = []) {
    if (typeof nombre !== "string" || !nombre.trim()) {
      throw new ValidationError("El evento debe tener un nombre");
    }
    if (!categoria) {
      throw new ValidationError("El evento debe tener una categoría");
    }
    if (!(fecha instanceof Date) || isNaN(fecha)) {
      throw new ValidationError("La fecha del evento debe ser una fecha válida");
    }
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
    const nombres = tiposEntrada.map((tipo) => tipo.nombre.toLowerCase());
    if (new Set(nombres).size !== nombres.length) {
      throw new ValidationError("El evento no puede tener dos tipos de entrada con el mismo nombre");
    }
    if (
      !Array.isArray(multimedia) ||
      multimedia.some((url) => typeof url !== "string" || !url.trim())
    ) {
      throw new ValidationError("La multimedia del evento debe ser una lista de URLs");
    }

    this.nombre = nombre;
    this.descripcion = descripcion;
    this.categoria = categoria;
    this.fecha = fecha;
    this.organizador = organizador;
    this.tiposEntrada = [...tiposEntrada];
    this.multimedia = [...multimedia];
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
}

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}
