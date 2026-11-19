import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { ALTO_TOQUE, colores, espacio, radio } from "../theme";

export default function Boton({ titulo, onPress, variante = "primario", cargando = false, deshabilitado = false }) {
  const inactivo = cargando || deshabilitado;
  const secundario = variante === "secundario";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        secundario ? estilos.secundario : estilos.primario,
        pressed && estilos.presionado,
        inactivo && estilos.inactivo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={secundario ? colores.primario : colores.textoSobrePrimario} />
      ) : (
        <Text style={[estilos.texto, secundario && estilos.textoSecundario]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: ALTO_TOQUE,
    paddingHorizontal: espacio.xl,
    borderRadius: radio.control,
    alignItems: "center",
    justifyContent: "center",
  },
  primario: { backgroundColor: colores.primario },
  secundario: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.primario },
  presionado: { opacity: 0.85 },
  inactivo: { opacity: 0.5 },
  texto: { color: colores.textoSobrePrimario, fontSize: 16, fontWeight: "600" },
  textoSecundario: { color: colores.primario },
});
