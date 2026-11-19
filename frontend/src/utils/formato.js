const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Manual a propósito: no depende de que el motor del celular traiga los datos de Intl para es-AR.
export const formatearPrecio = (monto) => {
  if (monto === 0) return "Gratis";
  return `$${Math.round(monto).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

const dosDigitos = (n) => String(n).padStart(2, "0");

// "sáb 5 dic · 21:30", en la hora del celular.
export const formatearFecha = (iso) => {
  const fecha = new Date(iso);
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()]} · ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
};
