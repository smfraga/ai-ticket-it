// Fondos del chat: una preferencia del celular (como en WhatsApp), la misma para todos los chats.
// Tonos oscuros, para que los globos (superficie oscura y naranja) se lean igual sobre cualquiera.
export const PALETA_DE_FONDOS = Object.freeze([
  { id: "noche", nombre: "Noche", color: "#14110F" },
  { id: "vino", nombre: "Vino", color: "#2A1218" },
  { id: "bosque", nombre: "Bosque", color: "#102119" },
  { id: "oceano", nombre: "Océano", color: "#0E1C2B" },
  { id: "ciruela", nombre: "Ciruela", color: "#22142B" },
  { id: "grafito", nombre: "Grafito", color: "#1E1E22" },
]);

export const FONDO_POR_DEFECTO = Object.freeze({ tipo: "color", id: "noche" });

// Lo que se guarda en el celular: el id del color (no el valor), así un cambio en la paleta no deja colores sueltos.
export const fondoParaGuardar = (fondo) => JSON.stringify(fondo);

// Lo guardado, ya validado; si no hay nada, está roto o es un color que ya no existe, el fondo por defecto.
export const fondoDesdeGuardado = (texto) => {
  try {
    const fondo = JSON.parse(texto);
    if (fondo?.tipo === "color" && PALETA_DE_FONDOS.some((opcion) => opcion.id === fondo.id)) {
      return { tipo: "color", id: fondo.id };
    }
  } catch {
    // JSON inválido: se usa el fondo por defecto.
  }
  return FONDO_POR_DEFECTO;
};

// El color para pintar el chat.
export const colorDelFondo = (fondo) =>
  (PALETA_DE_FONDOS.find((opcion) => opcion.id === fondo.id) ?? PALETA_DE_FONDOS[0]).color;
