import { StyleSheet, Text, View } from "react-native";
import { colores, fuentes } from "../theme";
import { iniciales } from "../utils/perfil";

// El círculo con las iniciales de una persona, en naranja con letras oscuras.
export default function Avatar({ persona, tamanio = 48 }) {
  return (
    <View
      style={[estilos.circulo, { width: tamanio, height: tamanio, borderRadius: tamanio / 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[estilos.letras, { fontSize: tamanio * 0.45, lineHeight: tamanio * 0.5 }]}>
        {iniciales(persona)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  circulo: { backgroundColor: colores.primario, alignItems: "center", justifyContent: "center" },
  letras: { fontFamily: fuentes.cartel, color: colores.textoSobrePrimario, paddingTop: 2 },
});
