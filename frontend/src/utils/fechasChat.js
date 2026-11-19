// Fechas de los chats, como en WhatsApp, en la hora del celular. Manual, como el resto de los formatos de la app.
const DIAS_COMPLETOS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MS_POR_DIA = 24 * 60 * 60 * 1000;

const dosDigitos = (n) => String(n).padStart(2, "0");
const inicioDelDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

// Días de calendario entre la fecha y hoy (0 = hoy, 1 = ayer). Se cuentan fechas y no horas: un mensaje de anoche
// a las 23:50 es de "ayer" aunque hayan pasado 10 minutos. Math.round absorbe un cambio de horario. Una fecha
// futura (el reloj del servidor adelantado) cuenta como hoy.
export const diasAtras = (fecha, ahora) =>
  Math.max(0, Math.round((inicioDelDia(ahora) - inicioDelDia(fecha)) / MS_POR_DIA));

export const horaDelMensaje = (iso) => {
  const fecha = new Date(iso);
  return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
};

// La hora del último mensaje en la lista de chats: la hora si es de hoy, "Ayer", el día de la semana dentro de la
// última semana y "dd/mm/aa" si es más viejo.
export const horaEnLista = (iso, ahora = new Date()) => {
  const fecha = new Date(iso);
  const dias = diasAtras(fecha, ahora);
  if (dias === 0) return horaDelMensaje(iso);
  if (dias === 1) return "Ayer";
  if (dias < 7) return DIAS_COMPLETOS[fecha.getDay()];
  return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${dosDigitos(fecha.getFullYear() % 100)}`;
};
