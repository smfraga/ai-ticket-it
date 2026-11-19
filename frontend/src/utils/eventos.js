// Entradas disponibles de un tipo, para el organizador: { cupo, cupoRestante } de GET /eventos/:id/compras.
export const textoCupo = ({ cupo, cupoRestante }) => {
  if (cupoRestante <= 0) return `Agotado (${cupo} de ${cupo} vendidas)`;
  return `${cupoRestante === 1 ? "Queda 1" : `Quedan ${cupoRestante}`} de ${cupo}`;
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
export const errorDeEvento = ({ nombre, categoriaId, fecha, tiposEntrada }, ahora = new Date()) => {
  if (!nombre.trim()) return "Escribí el nombre del evento.";
  if (!categoriaId) return "Elegí una categoría.";
  if (!(fecha instanceof Date) || fecha.getTime() <= ahora.getTime()) return "La fecha del evento tiene que ser futura.";
  if (tiposEntrada.length === 0) return "Agregá al menos un tipo de entrada.";

  for (const [i, tipo] of tiposEntrada.entries()) {
    const numero = `Tipo de entrada ${i + 1}`;
    if (!tipo.nombre.trim()) return `${numero}: escribí el nombre (por ejemplo, General o VIP).`;
    if (leerPrecio(tipo.precio) === null) return `${numero}: el precio tiene que ser un número (0 si es gratis).`;
    if (leerCupo(tipo.cupo) === null) return `${numero}: el cupo tiene que ser un número entero mayor a 0.`;
  }

  const nombres = tiposEntrada.map((tipo) => tipo.nombre.trim().toLowerCase());
  if (new Set(nombres).size !== nombres.length) return "Hay dos tipos de entrada con el mismo nombre.";
  return null;
};

// El cuerpo de POST /eventos. Llamar solo si errorDeEvento devolvió null.
export const armarEventoParaEnviar = ({ nombre, descripcion, categoriaId, fecha, tiposEntrada }) => ({
  nombre: nombre.trim(),
  ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
  categoriaId,
  fecha: fecha.toISOString(),
  tiposEntrada: tiposEntrada.map((tipo) => ({
    nombre: tipo.nombre.trim(),
    precio: leerPrecio(tipo.precio),
    cupo: leerCupo(tipo.cupo),
  })),
});

// "Mis eventos" pide periodo=todos (del más viejo al más nuevo). Se muestran primero los próximos, del más
// cercano al más lejano, y después los ya realizados, del más reciente al más viejo.
export const separarPorPeriodo = (eventos) => ({
  proximos: eventos.filter((evento) => !evento.yaPaso),
  pasados: eventos.filter((evento) => evento.yaPaso).reverse(),
});
