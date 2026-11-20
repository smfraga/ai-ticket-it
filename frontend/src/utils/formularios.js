// Errores por campo de los formularios de sesión: cada error se muestra debajo de su campo y queda asociado a él
// (el lector de pantalla lo lee junto con la etiqueta), y arriba del botón va un resumen que se anuncia.
// Las reglas son las mismas que valida el backend (authValidation), que igual las vuelve a validar.

export const LARGO_MINIMO_DE_PASSWORD = 8;
const FORMATO_DE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RESUMEN_DE_ERRORES = "Revisá los campos marcados.";

// Solo las claves con error; {} si está todo bien.
const sinVacios = (errores) => Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje));

export const hayErrores = (errores) => Object.keys(errores).length > 0;

export const erroresDeLogin = ({ email, password }) =>
  sinVacios({
    email: email.trim() ? null : "Escribí tu email.",
    password: password ? null : "Escribí tu contraseña.",
  });

export const erroresDeRegistro = ({ nombre, apellido, email, password }, roles) => {
  let errorDeEmail = null;
  if (!email.trim()) errorDeEmail = "Escribí tu email.";
  else if (!FORMATO_DE_EMAIL.test(email.trim())) errorDeEmail = "El email no es válido (por ejemplo, ana@mail.com).";

  return sinVacios({
    nombre: nombre.trim() ? null : "Escribí tu nombre.",
    apellido: apellido.trim() ? null : "Escribí tu apellido.",
    email: errorDeEmail,
    password:
      password.length >= LARGO_MINIMO_DE_PASSWORD
        ? null
        : `La contraseña tiene que tener al menos ${LARGO_MINIMO_DE_PASSWORD} caracteres.`,
    roles: roles.length > 0 ? null : "Elegí al menos un rol.",
  });
};

// Un 400 del backend trae en `details` los problemas de Zod, cada uno con el campo en `path[0]`. Se ubican en su
// campo solo los de `campos` (el primero de cada uno); lo demás queda para el mensaje general.
export const erroresDelServidor = (error, campos) => {
  const detalles = Array.isArray(error?.details) ? error.details : [];
  const errores = {};
  for (const { path, message } of detalles) {
    const campo = Array.isArray(path) ? path[0] : undefined;
    if (campos.includes(campo) && !errores[campo] && message) errores[campo] = message;
  }
  return errores;
};
