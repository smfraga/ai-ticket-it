import { Pressable, StyleSheet, Text, View } from "react-native";
import { ALTO_TOQUE, colores, espacio, radio } from "../theme";

function BotonCantidad({ simbolo, etiqueta, onPress, deshabilitado }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={[estilos.boton, deshabilitado && estilos.deshabilitado]}
    >
      <Text style={estilos.simbolo}>{simbolo}</Text>
    </Pressable>
  );
}

// Cantidad entre `minimo` y `maximo` (el cupo que queda), con botones de 48 pt.
export default function SelectorCantidad({ valor, onCambiar, minimo = 1, maximo }) {
  return (
    <View style={estilos.fila}>
      <BotonCantidad
        simbolo="−"
        etiqueta="Una entrada menos"
        deshabilitado={valor <= minimo}
        onPress={() => onCambiar(valor - 1)}
      />
      <Text style={estilos.valor} accessibilityLabel={`${valor} entradas`}>
        {valor}
      </Text>
      <BotonCantidad
        simbolo="+"
        etiqueta="Una entrada más"
        deshabilitado={valor >= maximo}
        onPress={() => onCambiar(valor + 1)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", gap: espacio.l },
  boton: {
    width: ALTO_TOQUE,
    height: ALTO_TOQUE,
    borderRadius: radio.control,
    borderWidth: 1,
    borderColor: colores.primario,
    backgroundColor: colores.superficie,
    alignItems: "center",
    justifyContent: "center",
  },
  deshabilitado: { opacity: 0.4 },
  simbolo: { fontSize: 24, color: colores.primario, fontWeight: "600" },
  valor: { fontSize: 20, fontWeight: "700", color: colores.texto, minWidth: 32, textAlign: "center" },
});
