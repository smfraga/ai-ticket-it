import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";

// "Noche de evento": fondo oscuro de sala y el naranja como luz de escenario. Contrastes medidos (WCAG):
// texto 16:1, texto suave 7,5:1 sobre superficie, naranja 8,3:1 sobre superficie. Sobre el naranja siempre va
// texto oscuro (9:1): el blanco no llega (2:1).
export const colores = {
  primario: "#FFA213",
  primarioOscuro: "#FFA213", // naranja para texto (categorías, autor del mensaje): sobre fondo oscuro alcanza
  primarioSuave: "#3A2A10", // fondo de lo elegido (tipo de entrada, rol)
  fondo: "#14110F",
  superficie: "#221D19",
  superficieAlta: "#2C241D",
  borde: "#3A322B", // separa tarjetas
  bordeControl: "#75675A", // borde de campos y botones secundarios (3:1)
  texto: "#F5EFE6",
  textoSuave: "#B8AC9C",
  textoPlaceholder: "#9A8E80",
  textoSobrePrimario: "#1F1408",
  horaSobrePrimario: "#5C3A00", // hora en el globo propio (5:1 sobre el naranja)
  error: "#FF8A80",
  errorSuave: "#3A1614",
  exito: "#5FD39A",
  exitoSuave: "#10301F",
  aviso: "#FFC266",
  capaSobreFoto: "rgba(0, 0, 0, 0.6)",
  textoSobreCapa: "#FFFFFF",
};

// Etiqueta de cada estado de compra: fondo y texto (todos por encima de 7:1).
export const coloresDeEstado = {
  PENDIENTE: { fondo: "#3A2A10", texto: "#FFC266" },
  CONFIRMADA: { fondo: "#10301F", texto: "#5FD39A" },
  UTILIZADA: { fondo: "#1E2638", texto: "#9DB8FF" },
  CANCELADA: { fondo: "#3A1614", texto: "#FF8A80" },
  REEMBOLSADA: { fondo: "#2A2724", texto: "#CFC6BA" },
};

// Las fuentes que carga App.js con `useFonts`. En React Native una fuente propia no tiene negrita automática:
// cada peso es una familia distinta, por eso los estilos usan `fontFamily` y no `fontWeight`.
export const archivosDeFuentes = {
  BebasNeue_400Regular,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
};

export const fuentes = {
  cartel: "BebasNeue_400Regular", // títulos, como en un afiche (solo mayúsculas)
  regular: "DMSans_400Regular",
  media: "DMSans_500Medium",
  seminegrita: "DMSans_600SemiBold",
  negrita: "DMSans_700Bold",
};

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

export const radio = { control: 12, tarjeta: 16, pastilla: 999 };

export const tipografia = {
  titulo: { fontFamily: fuentes.cartel, fontSize: 36, lineHeight: 38, letterSpacing: 0.5, color: colores.texto },
  subtitulo: { fontFamily: fuentes.negrita, fontSize: 18, color: colores.texto },
  cuerpo: { fontFamily: fuentes.regular, fontSize: 16, color: colores.texto },
  suave: { fontFamily: fuentes.regular, fontSize: 14, color: colores.textoSuave },
  etiqueta: { fontFamily: fuentes.seminegrita, fontSize: 13, letterSpacing: 0.3, color: colores.textoSuave },
};

// Tamaño mínimo de toque recomendado en el celular.
export const ALTO_TOQUE = 48;
