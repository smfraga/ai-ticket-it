import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { ALTO_TOQUE, colores, espacio, fuentes, radio } from "../theme";

export default function Boton({ titulo, onPress, variante = "primario", cargando = false, deshabilitado = false }) {
  const inactivo = cargando || deshabilitado;
  const peligro = variante === "peligro";
  const secundario = variante === "secundario" || peligro;
  const colorDeTexto = peligro ? colores.error : colores.primario;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        secundario ? estilos.secundario : estilos.primario,
        peligro && estilos.peligro,
        pressed && estilos.presionado,
        inactivo && estilos.inactivo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={secundario ? colorDeTexto : colores.textoSobrePrimario} />
      ) : (
        <Text style={[estilos.texto, secundario && { color: colorDeTexto }]}>{titulo}</Text>
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
  peligro: { borderColor: colores.error },
  secundario: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.primario },
  presionado: { opacity: 0.85 },
  inactivo: { opacity: 0.5 },
  texto: { color: colores.textoSobrePrimario, fontSize: 16, fontFamily: fuentes.seminegrita },
});
