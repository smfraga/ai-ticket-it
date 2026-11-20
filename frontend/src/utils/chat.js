import { conSeparadores } from "./fechasChat";

// Mismo tope que el backend (Zod: 1 a 500 caracteres después de recortar los espacios).
export const LARGO_MAXIMO_DE_MENSAJE = 500;

export const ETIQUETAS_DE_ROL_EN_LA_COMPRA = Object.freeze({ COMPRADOR: "Comprador", ORGANIZADOR: "Organizador" });

// El texto listo para mandar, o null si quedó vacío o se pasa del tope.
export const textoEnviable = (texto) => {
  const recortado = texto.trim();
  if (!recortado || recortado.length > LARGO_MAXIMO_DE_MENSAJE) return null;
  return recortado;
};

// Los globos propios van a la derecha. Se compara por id, no por rol: el mismo usuario podría tener los dos roles.
export const esMensajePropio = (mensaje, usuarioId) => mensaje.autor.id === usuarioId;

// Lo que muestra el chat, del más nuevo al más viejo: la lista va invertida (abre abajo, en el último mensaje, como
// WhatsApp), así que el primer elemento se dibuja abajo de todo. Cada separador de día queda arriba de sus mensajes.
export const elementosDelChat = (mensajes, ahora = new Date()) => conSeparadores(mensajes, ahora).reverse();

// En la lista invertida el final (lo más nuevo) está en el desplazamiento 0: se sigue el final si quien lee no subió.
export const estaCercaDelFinal = (desplazamiento, distancia) => desplazamiento < distancia;

// Los mensajes no tienen id en la API: se identifican por autor, fecha y posición.
export const claveDeMensaje = (mensaje, indice) => `${mensaje.autor.id}-${mensaje.enviado}-${indice}`;

// El número de la pestaña Mensajes: nada si no hay mensajes nuevos y "99+" si son muchos (no entra en el círculo).
export const insigniaDeNoLeidos = (total) => {
  if (!total || total <= 0) return undefined;
  return total > 99 ? "99+" : total;
};

// Debajo del evento, en la lista de chats: con quién se habla y qué compró ("Olivia Rossi · General ×2").
export const lineaDeLaConversacion = ({ contraparte, tipoEntrada, cantidad }) =>
  `${contraparte.nombre} ${contraparte.apellido} · ${tipoEntrada.nombre} ×${cantidad}`;

// El último mensaje como vista previa, con "Vos: " si lo escribió quien mira.
export const vistaPreviaDelMensaje = ({ ultimoMensaje }) =>
  ultimoMensaje.propio ? `Vos: ${ultimoMensaje.texto}` : ultimoMensaje.texto;
