const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const dosDigitos = (n) => String(n).padStart(2, "0");

// "sáb 5 dic a las 21:30", en la hora local del servidor. Mismo estilo que la app, para los avisos del chat.
export const formatearFecha = (fecha) =>
  `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()]} a las ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;

// "$12.000"
export const formatearPrecio = (monto) =>
  `$${Math.round(monto)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
