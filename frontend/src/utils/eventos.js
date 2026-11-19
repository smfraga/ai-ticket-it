// Entradas disponibles de un tipo, para el organizador: { cupo, cupoRestante } de GET /eventos/:id/compras.
export const textoCupo = ({ cupo, cupoRestante }) => {
  if (cupoRestante <= 0) return `Agotado (${cupo} de ${cupo} vendidas)`;
  return `${cupoRestante === 1 ? "Queda 1" : `Quedan ${cupoRestante}`} de ${cupo}`;
};

// --- Filtro de precio del catálogo -----------------------------------------------------------------------------
// El backend filtra con Evento.tuPrecioEstaEntre(min, max): entra un evento si alguna de sus entradas está en el
// rango (extremos incluidos). "Cualquiera" no manda nada.
export const RANGOS_DE_PRECIO = Object.freeze([
  { valor: "cualquiera", etiqueta: "Cualquiera" },
  { valor: "hasta5000", etiqueta: "Hasta $5.000", precioMax: 5000 },
  { valor: "5000a10000", etiqueta: "$5.000 a $10.000", precioMin: 5000, precioMax: 10000 },
  { valor: "masDe10000", etiqueta: "Más de $10.000", precioMin: 10000 },
]);
// Los rangos se eligieron para que, con el seed, cada uno muestre eventos distintos: un rango ancho (por ejemplo
// $5.000 a $15.000) incluía a todos, porque cada evento tiene alguna entrada en ese rango.

// { precioMin, precioMax } para listarEventos; los que no aplican quedan undefined y no se mandan.
export const parametrosDePrecio = (valor) => {
  const rango = RANGOS_DE_PRECIO.find((r) => r.valor === valor);
  return { precioMin: rango?.precioMin, precioMax: rango?.precioMax };
};

// --- Favoritos -------------------------------------------------------------------------------------------------

// Un Set nuevo con el evento guardado o quitado; no modifica el anterior (React compara por referencia).
export const conFavorito = (ids, eventoId, guardado) => {
  const nuevos = new Set(ids);
  if (guardado) nuevos.add(eventoId);
  else nuevos.delete(eventoId);
  return nuevos;
};

// --- Crear evento ---------------------------------------------------------------------------------------------
// El formulario guarda precio y cupo como texto (lo que se tipea); se validan y convierten antes de enviar.
// El backend vuelve a validar todo (400) y exige que la fecha sea futura.

export const tipoEntradaVacio = () => ({ nombre: "", precio: "", cupo: "" });

// Una semana después de hoy, a las 21:00: un punto de partida razonable para el selector.
export const fechaInicialDeEvento = (ahora = new Date()) => {
  const fecha = new Date(ahora);
  fecha.setDate(fecha.getDate() + 7);
  fecha.setHours(21, 0, 0, 0);
  return fecha;
};

// "15000", "15000,50" o "15000.5" (el teclado del iPhone en español usa coma). null si no es un precio válido.
export const leerPrecio = (texto) => {
  const limpio = String(texto).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  return Number(limpio);
};

// Solo enteros positivos. null si no es un cupo válido.
export const leerCupo = (texto) => {
  const limpio = String(texto).trim();
  if (!/^\d+$/.test(limpio) || Number(limpio) <= 0) return null;
  return Number(limpio);
};

// El primer problema del formulario, o null si se puede enviar. Los tipos se numeran desde 1, como en pantalla.
// Imagen opcional: vacía, o una URL http(s) sin espacios (el backend la vuelve a validar).
const URL_DE_IMAGEN = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

export const errorDeEvento = ({ nombre, categoriaId, fecha, tiposEntrada, imagen = "" }, ahora = new Date()) => {
  if (!nombre.trim()) return "Escribí el nombre del evento.";
  if (imagen.trim() && !URL_DE_IMAGEN.test(imagen.trim())) {
    return "La imagen tiene que ser una dirección web que empiece con https:// (o dejala vacía).";
  }
  if (!categoriaId) return "Elegí una categoría.";
  if (!(fecha instanceof Date) || fecha.getTime() <= ahora.getTime())
    return "La fecha del evento tiene que ser futura.";
  if (tiposEntrada.length === 0) return "Agregá al menos un tipo de entrada.";

  for (const [i, tipo] of tiposEntrada.entries()) {
    const numero = `Tipo de entrada ${i + 1}`;
    if (!tipo.nombre.trim()) return `${numero}: escribí el nombre (por ejemplo, General o VIP).`;
    if (leerPrecio(tipo.precio) === null) return `${numero}: el precio tiene que ser un número (0 si es gratis).`;
    if (leerCupo(tipo.cupo) === null) return `${numero}: el cupo tiene que ser un número entero mayor a 0.`;
    // Solo al editar: un tipo con ventas no puede quedar con menos cupo que lo vendido (el backend da 409).
    if (tipo.vendidas > 0 && leerCupo(tipo.cupo) < tipo.vendidas) {
      return `${numero}: el cupo no puede ser menor a las ${tipo.vendidas} entradas vendidas.`;
    }
  }

  const nombres = tiposEntrada.map((tipo) => tipo.nombre.trim().toLowerCase());
  if (new Set(nombres).size !== nombres.length) return "Hay dos tipos de entrada con el mismo nombre.";
  return null;
};

// El cuerpo de POST /eventos. Llamar solo si errorDeEvento devolvió null.
export const armarEventoParaEnviar = ({ nombre, descripcion, categoriaId, fecha, tiposEntrada, imagen = "" }) => ({
  nombre: nombre.trim(),
  ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
  ...(imagen.trim() ? { multimedia: [imagen.trim()] } : {}),
  categoriaId,
  fecha: fecha.toISOString(),
  tiposEntrada: tiposEntrada.map(tipoParaEnviar),
});

// Con `id` si el tipo ya existía (al editar); sin `id`, el backend lo crea.
const tipoParaEnviar = (tipo) => ({
  ...(tipo.id ? { id: tipo.id } : {}),
  nombre: tipo.nombre.trim(),
  precio: leerPrecio(tipo.precio),
  cupo: leerCupo(tipo.cupo),
});

// --- Editar evento --------------------------------------------------------------------------------------------

// El evento de GET /eventos/:id con la forma del formulario. `vendidas` sale de cupo - disponibles: con ventas, la
// pantalla bloquea el precio y no deja quitar el tipo (las mismas reglas que el backend).
export const eventoAFormulario = (evento) => ({
  nombre: evento.nombre,
  descripcion: evento.descripcion ?? "",
  imagen: evento.multimedia?.[0] ?? "",
  categoriaId: evento.categoria.id,
  fecha: new Date(evento.fecha),
  tiposEntrada: evento.tiposEntrada.map((tipo) => ({
    id: tipo.id,
    nombre: tipo.nombre,
    precio: String(tipo.precio),
    cupo: String(tipo.cupo),
    vendidas: tipo.cupo - tipo.disponibles,
  })),
});

// El cuerpo de PATCH /eventos/:id. Manda todo el formulario (la descripción vacía también, para poder borrarla).
// El formulario edita solo la primera imagen: las demás del evento se conservan.
export const armarEdicionParaEnviar = (formulario, eventoOriginal) => {
  const resto = (eventoOriginal.multimedia ?? []).slice(1);
  const imagen = formulario.imagen.trim();
  return {
    nombre: formulario.nombre.trim(),
    descripcion: formulario.descripcion.trim(),
    categoriaId: formulario.categoriaId,
    fecha: formulario.fecha.toISOString(),
    multimedia: imagen ? [imagen, ...resto] : resto,
    tiposEntrada: formulario.tiposEntrada.map(tipoParaEnviar),
  };
};

// Se puede editar o cancelar solo un evento propio que no pasó ni está cancelado (respuesta de GET /eventos/:id/compras).
export const puedeGestionarEvento = (evento) => !evento.yaPaso && !evento.cancelado;

// "Mis eventos" pide periodo=todos (del más viejo al más nuevo). Se muestran primero los próximos, del más
// cercano al más lejano, y después los ya realizados, del más reciente al más viejo.
export const separarPorPeriodo = (eventos) => ({
  proximos: eventos.filter((evento) => !evento.yaPaso),
  pasados: eventos.filter((evento) => evento.yaPaso).reverse(),
});
