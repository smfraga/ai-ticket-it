import { StyleSheet, Text, View } from "react-native";
import { colores, espacio, radio } from "../theme";
import { ETIQUETAS_DE_ESTADO } from "../utils/compras";

// El estado se distingue por el texto y por el color (no solo por el color).
const COLORES = {
  PENDIENTE: { fondo: "#fdf3dc", texto: "#7a4a06" },
  CONFIRMADA: { fondo: "#e1f3e9", texto: "#14663b" },
  UTILIZADA: { fondo: colores.primarioSuave, texto: colores.primarioOscuro },
  CANCELADA: { fondo: colores.errorSuave, texto: "#8a1c14" },
  REEMBOLSADA: { fondo: "#e8eaf0", texto: "#3b3f55" },
};

export default function EstadoCompra({ estado }) {
  const { fondo, texto } = COLORES[estado] ?? COLORES.REEMBOLSADA;

  return (
    <View style={[estilos.etiqueta, { backgroundColor: fondo }]}>
      <Text style={[estilos.texto, { color: texto }]}>{ETIQUETAS_DE_ESTADO[estado] ?? estado}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  etiqueta: {
    alignSelf: "flex-start",
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.xs,
    borderRadius: radio.pastilla,
  },
  texto: { fontSize: 13, fontWeight: "700" },
});
