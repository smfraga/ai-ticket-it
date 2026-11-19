import { Pressable, StyleSheet, Text, View } from "react-native";
import { ALTO_TOQUE, colores, espacio, tipografia } from "../theme";
import { ETIQUETAS_DE_PUNTUACION, PUNTUACION_MAXIMA } from "../utils/compras";

const ESTRELLAS = Array.from({ length: PUNTUACION_MAXIMA }, (_, indice) => indice + 1);

// Cinco botones de 48 pt; `valor` null = todavía sin elegir.
export default function SelectorEstrellas({ valor, onCambiar }) {
  return (
    <View style={estilos.contenedor}>
      <View style={estilos.fila} accessibilityRole="radiogroup">
        {ESTRELLAS.map((numero) => {
          const llena = valor !== null && numero <= valor;
          return (
            <Pressable
              key={numero}
              accessibilityRole="radio"
              accessibilityLabel={`${numero} ${numero === 1 ? "estrella" : "estrellas"}`}
              accessibilityState={{ checked: valor === numero }}
              onPress={() => onCambiar(numero)}
              style={estilos.boton}
            >
              <Text style={[estilos.estrella, llena && estilos.llena]}>{llena ? "★" : "☆"}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={tipografia.suave}>{valor ? ETIQUETAS_DE_PUNTUACION[valor] : "Tocá una estrella"}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espacio.xs },
  fila: { flexDirection: "row" },
  boton: { width: ALTO_TOQUE, height: ALTO_TOQUE, alignItems: "center", justifyContent: "center" },
  estrella: { fontSize: 34, color: colores.borde },
  llena: { color: colores.aviso },
});
