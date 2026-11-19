// Entradas disponibles de un tipo, para el organizador: { cupo, cupoRestante } de GET /eventos/:id/compras.
export const textoCupo = ({ cupo, cupoRestante }) => {
  if (cupoRestante <= 0) return `Agotado (${cupo} de ${cupo} vendidas)`;
  return `${cupoRestante === 1 ? "Queda 1" : `Quedan ${cupoRestante}`} de ${cupo}`;
};

// "Mis eventos" pide periodo=todos (del más viejo al más nuevo). Se muestran primero los próximos, del más
// cercano al más lejano, y después los ya realizados, del más reciente al más viejo.
export const separarPorPeriodo = (eventos) => ({
  proximos: eventos.filter((evento) => !evento.yaPaso),
  pasados: eventos.filter((evento) => evento.yaPaso).reverse(),
});
