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

// --- Filtros del catálogo --------------------------------------------------------------------------------------
// Viven plegados en una hoja ("Filtros"). Debajo del buscador se ve cada filtro que no está en su valor por defecto,
// para quitarlo de un toque.

export const FILTROS_POR_DEFECTO = Object.freeze({
  categoriaId: null,
  periodo: "proximos",
  rangoDePrecio: "cualquiera",
  orden: "fecha",
});

// [{ clave, etiqueta }] de los filtros cambiados, en el orden de la hoja. `periodos` y `ordenes` son las listas
// { valor, etiqueta } del servicio de eventos; `categorias`, las del backend (si no llegaron, dice "Categoría").
export const filtrosActivos = (filtros, { categorias = [], periodos = [], ordenes = [] } = {}) => {
  const activos = [];
  if (filtros.categoriaId !== FILTROS_POR_DEFECTO.categoriaId) {
    const categoria = categorias.find((c) => c.id === filtros.categoriaId);
    activos.push({ clave: "categoriaId", etiqueta: categoria?.nombre ?? "Categoría" });
  }
  if (filtros.periodo !== FILTROS_POR_DEFECTO.periodo) {
    const periodo = periodos.find((p) => p.valor === filtros.periodo);
    activos.push({ clave: "periodo", etiqueta: periodo?.etiqueta ?? filtros.periodo });
  }
  if (filtros.rangoDePrecio !== FILTROS_POR_DEFECTO.rangoDePrecio) {
    const rango = RANGOS_DE_PRECIO.find((r) => r.valor === filtros.rangoDePrecio);
    activos.push({ clave: "rangoDePrecio", etiqueta: rango?.etiqueta ?? filtros.rangoDePrecio });
  }
  if (filtros.orden !== FILTROS_POR_DEFECTO.orden) {
    const orden = ordenes.find((o) => o.valor === filtros.orden);
    activos.push({ clave: "orden", etiqueta: `Orden: ${orden?.etiqueta ?? filtros.orden}` });
  }
  return activos;
};

// Los filtros con uno vuelto a su valor por defecto (la ✕ de cada filtro activo).
export const sinFiltro = (filtros, clave) => ({ ...filtros, [clave]: FILTROS_POR_DEFECTO[clave] });

// "Filtros" o "Filtros (2)", para el botón que abre la hoja.
export const tituloDelBotonDeFiltros = (cantidad) => (cantidad > 0 ? `Filtros (${cantidad})` : "Filtros");

// --- Paginación del catálogo (scroll infinito) ----------------------------------------------------------------

// Con `pagina` y `totalPaginas` de la respuesta paginada: hay más si la que llegó no es la última.
export const hayMasPaginas = (pagina, totalPaginas) => pagina < totalPaginas;

// Al pie del catálogo: "Mostrando 20 de 37 eventos" (o "Mostrando los 7 eventos" si ya están todos).
export const textoDeCantidad = (mostrados, total) => {
  if (total === 0) return null;
  if (mostrados >= total) return total === 1 ? "Mostrando el único evento" : `Mostrando los ${total} eventos`;
  return `Mostrando ${mostrados} de ${total} eventos`;
};

// Suma una página al final sin repetir eventos (si el catálogo cambió entre página y página, uno puede repetirse).
export const agregarPagina = (previos, nuevos) => {
  const ids = new Set(previos.map((evento) => evento.id));
  return previos.concat(nuevos.filter((evento) => !ids.has(evento.id)));
};

// --- Favoritos -------------------------------------------------------------------------------------------------

// Un Set nuevo con el evento guardado o quitado; no modifica el anterior (React compara por referencia).
export const conFavorito = (ids, eventoId, guardado) => {
  const nuevos = new Set(ids);
  if (guardado) nuevos.add(eventoId);
  else nuevos.delete(eventoId);
  return nuevos;
};

// Cuenta regresiva de la tarjeta de favorito, con `diasParaElEvento` del backend (días de calendario, null si ya
// se realizó): no depende del reloj del celular. Un evento cancelado lo dice antes que nada.
export const textoCuentaRegresiva = ({ cancelado, yaPaso, diasParaElEvento }) => {
  if (cancelado) return "Cancelado";
  if (yaPaso || diasParaElEvento === null || diasParaElEvento === undefined) return "Ya se realizó";
  if (diasParaElEvento === 0) return "Es hoy";
  if (diasParaElEvento === 1) return "Falta 1 día";
  return `Faltan ${diasParaElEvento} días`;
};

// Pocas entradas: 20 o menos, o el 10 % del cupo total o menos (lo que se cumpla primero).
export const POCAS_ENTRADAS = 20;
export const FRACCION_DE_POCAS_ENTRADAS = 0.1;

// "Agotado" si no queda ningún lugar, "Quedan pocas" si quedan pocos, o null. Sin aviso si el evento ya se
// realizó o se canceló: ahí ya no se vende.
export const avisoDeCupo = ({ cancelado, yaPaso, tiposEntrada }) => {
  if (cancelado || yaPaso) return null;
  const disponibles = tiposEntrada.reduce((total, tipo) => total + tipo.disponibles, 0);
  const cupo = tiposEntrada.reduce((total, tipo) => total + tipo.cupo, 0);
  if (disponibles === 0) return "Agotado";
  if (disponibles <= POCAS_ENTRADAS || disponibles <= cupo * FRACCION_DE_POCAS_ENTRADAS) return "Quedan pocas";
  return null;
};

// Arriba de la grilla: "3 guardados · el próximo en 5 días". El próximo es el que menos días tiene entre los que
// todavía no se realizaron ni se cancelaron; si no hay ninguno, solo la cantidad. Sin favoritos, null.
export const resumenDeFavoritos = (eventos) => {
  if (eventos.length === 0) return null;
  const cantidad = eventos.length === 1 ? "1 guardado" : `${eventos.length} guardados`;
  const dias = eventos
    .filter((evento) => !evento.cancelado && !evento.yaPaso && Number.isInteger(evento.diasParaElEvento))
    .map((evento) => evento.diasParaElEvento);
  if (dias.length === 0) return cantidad;
  const proximo = Math.min(...dias);
  if (proximo === 0) return `${cantidad} · el próximo es hoy`;
  if (proximo === 1) return `${cantidad} · el próximo es mañana`;
  return `${cantidad} · el próximo en ${proximo} días`;
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
