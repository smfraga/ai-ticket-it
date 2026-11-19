import { StyleSheet, Text } from "react-native";
import { colores, espacio, fuentes, radio } from "../theme";

// "Hoy", "Ayer", "Martes"… entre los mensajes del chat. Pastilla opaca: se lee sobre cualquier fondo.
export default function SeparadorDeDia({ etiqueta }) {
  return (
    <Text style={estilos.separador} accessibilityRole="header">
      {etiqueta}
    </Text>
  );
}

const estilos = StyleSheet.create({
  separador: {
    alignSelf: "center",
    marginVertical: espacio.s,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.xs,
    borderRadius: radio.pastilla,
    overflow: "hidden",
    backgroundColor: colores.superficieAlta,
    color: colores.textoSuave,
    fontFamily: fuentes.seminegrita,
    fontSize: 12,
  },
});
