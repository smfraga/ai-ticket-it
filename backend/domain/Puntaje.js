// Puntaje del organizador: promedio simple de sus reseñas, con 1 decimal.
// Devuelve null si todavía no tiene reseñas (no es lo mismo que un puntaje de 0).
export function calcularPuntaje(resenias) {
  if (!Array.isArray(resenias) || resenias.length === 0) return null;
  const suma = resenias.reduce((total, resenia) => total + resenia.puntuacion, 0);
  return Math.round((suma / resenias.length) * 10) / 10;
}
