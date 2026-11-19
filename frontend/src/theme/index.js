export const colores = {
  primario: "#4f46e5",
  primarioOscuro: "#3730a3",
  primarioSuave: "#eef2ff",
  fondo: "#f7f7fb",
  superficie: "#ffffff",
  borde: "#e2e4ee",
  texto: "#1b1c2e",
  textoSuave: "#5d6078",
  textoSobrePrimario: "#ffffff",
  error: "#b3261e",
  errorSuave: "#fdecea",
  exito: "#1a7f4b",
  aviso: "#b26a00",
};

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

export const radio = { control: 10, tarjeta: 16, pastilla: 999 };

export const tipografia = {
  titulo: { fontSize: 24, fontWeight: "700", color: colores.texto },
  subtitulo: { fontSize: 18, fontWeight: "600", color: colores.texto },
  cuerpo: { fontSize: 16, color: colores.texto },
  suave: { fontSize: 14, color: colores.textoSuave },
  etiqueta: { fontSize: 13, fontWeight: "600", color: colores.textoSuave },
};

// Tamaño mínimo de toque recomendado en el celular.
export const ALTO_TOQUE = 48;
