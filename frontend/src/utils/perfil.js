// Mismo tope que el backend (Zod: de 1 a 60 caracteres después de recortar los espacios).
export const LARGO_MAXIMO_DE_NOMBRE = 60;

// El primer problema del formulario de perfil, o null si se puede enviar.
export const errorDePerfil = ({ nombre, apellido }) => {
  if (!nombre.trim()) return "Escribí tu nombre.";
  if (!apellido.trim()) return "Escribí tu apellido.";
  if (nombre.trim().length > LARGO_MAXIMO_DE_NOMBRE)
    return `El nombre puede tener hasta ${LARGO_MAXIMO_DE_NOMBRE} letras.`;
  if (apellido.trim().length > LARGO_MAXIMO_DE_NOMBRE) {
    return `El apellido puede tener hasta ${LARGO_MAXIMO_DE_NOMBRE} letras.`;
  }
  return null;
};

// Si el formulario cambió algo respecto del usuario (sin contar espacios de los bordes): si no, no hace falta enviar.
export const perfilCambio = (usuario, { nombre, apellido }) =>
  nombre.trim() !== usuario.nombre || apellido.trim() !== usuario.apellido;
