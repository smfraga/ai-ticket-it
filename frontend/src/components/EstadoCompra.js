import { StyleSheet, Text, View } from "react-native";
import { coloresDeEstado, espacio, fuentes, radio } from "../theme";
import { ETIQUETAS_DE_ESTADO } from "../utils/compras";

// El estado se distingue por el texto y por el color (no solo por el color).
export default function EstadoCompra({ estado }) {
  const { fondo, texto } = coloresDeEstado[estado] ?? coloresDeEstado.REEMBOLSADA;

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
  texto: { fontSize: 13, fontFamily: fuentes.negrita },
});
