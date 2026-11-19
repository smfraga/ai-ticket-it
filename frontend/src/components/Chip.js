import { Pressable, StyleSheet, Text } from "react-native";
import { colores, espacio, radio } from "../theme";

export default function Chip({ etiqueta, activo, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={[estilos.chip, activo && estilos.activo]}
    >
      <Text style={[estilos.texto, activo && estilos.textoActivo]}>{etiqueta}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: espacio.l,
    justifyContent: "center",
    borderRadius: radio.pastilla,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  activo: { backgroundColor: colores.primario, borderColor: colores.primario },
  texto: { fontSize: 14, color: colores.textoSuave },
  textoActivo: { color: colores.textoSobrePrimario, fontWeight: "600" },
});
