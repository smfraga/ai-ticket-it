import { Pressable, StyleSheet, Text } from "react-native";
import { colores } from "../theme";

// Corazón para guardar o quitar un evento de favoritos. Área de toque de 44 pt aunque el ícono sea más chico.
export default function BotonFavorito({ favorito, onPress, tamanio = 24 }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={favorito ? "Quitar de favoritos" : "Guardar en favoritos"}
      accessibilityState={{ selected: favorito }}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
    >
      <Text style={[estilos.corazon, { fontSize: tamanio }, favorito && estilos.lleno]}>{favorito ? "♥" : "♡"}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  presionado: { opacity: 0.6 },
  corazon: { color: colores.textoSuave },
  lleno: { color: colores.error },
});
