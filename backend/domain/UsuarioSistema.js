// Quien figura en el seguimiento cuando la plataforma cambia una compra sola (por ejemplo, al vencer el plazo de
// pago). No está en el repositorio, no tiene roles ni contraseña, así que nadie puede iniciar sesión con él.
export const ID_USUARIO_SISTEMA = "sistema";

export const USUARIO_SISTEMA = Object.freeze({
  id: ID_USUARIO_SISTEMA,
  nombre: "AI Ticket It",
  apellido: "",
  roles: Object.freeze([]),
  tieneRol: () => false,
  esElMismo: (otro) => otro?.id === ID_USUARIO_SISTEMA,
});
