// Mismo tope que el backend (Zod: de 1 a 60 caracteres después de recortar los espacios).
export const LARGO_MAXIMO_DE_NOMBRE = 60;

const errorDeNombre = (valor, campo) => {
  if (!valor.trim()) return `Escribí tu ${campo}.`;
  if (valor.trim().length > LARGO_MAXIMO_DE_NOMBRE)
    return `El ${campo} puede tener hasta ${LARGO_MAXIMO_DE_NOMBRE} letras.`;
  return null;
};

// Los problemas del formulario de perfil, por campo, para mostrarlos debajo de cada uno ({} si está todo bien).
export const erroresDePerfil = ({ nombre, apellido }) =>
  Object.fromEntries(
    [
      ["nombre", errorDeNombre(nombre, "nombre")],
      ["apellido", errorDeNombre(apellido, "apellido")],
    ].filter(([, mensaje]) => mensaje),
  );

// El primer problema del formulario de perfil, o null si se puede enviar.
export const errorDePerfil = (datos) => {
  const errores = erroresDePerfil(datos);
  return errores.nombre ?? errores.apellido ?? null;
};

// Si el formulario cambió algo respecto del usuario (sin contar espacios de los bordes): si no, no hace falta enviar.
export const perfilCambio = (usuario, { nombre, apellido }) =>
  nombre.trim() !== usuario.nombre || apellido.trim() !== usuario.apellido;

// Las iniciales para el círculo del perfil ("CG" para Carla Gómez).
export const iniciales = ({ nombre, apellido }) =>
  `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase();

// "2 próximos · 1 realizado · 1 cancelado", sin las partes en cero; "Ninguno todavía" si no creó eventos.
export const textoEventosCreados = ({ proximos, realizados, cancelados }) => {
  const partes = [
    [proximos, "próximo", "próximos"],
    [realizados, "realizado", "realizados"],
    [cancelados, "cancelado", "cancelados"],
  ]
    .filter(([cantidad]) => cantidad > 0)
    .map(([cantidad, singular, plural]) => `${cantidad} ${cantidad === 1 ? singular : plural}`);
  return partes.length ? partes.join(" · ") : "Ninguno todavía";
};

// "★ 4.5" y "4 reseñas", o "Sin reseñas" si todavía no tiene.
export const textoPuntaje = (puntaje) => (puntaje === null ? "—" : `★ ${puntaje.toFixed(1)}`);
export const textoCantidadDeResenias = (cantidad) =>
  cantidad === 0 ? "Sin reseñas" : `${cantidad} ${cantidad === 1 ? "reseña" : "reseñas"}`;

// La URL completa de una foto de perfil: el backend manda la ruta ("/usuarios/:id/foto?v=2") o null.
export const urlDeFoto = (ruta, apiUrl) => (ruta ? `${apiUrl.replace(/\/+$/, "")}${ruta}` : null);

// Lado de la foto que se sube: la app la achica antes de mandarla (el backend acepta hasta 64 KB).
export const LADO_DE_FOTO = 256;
