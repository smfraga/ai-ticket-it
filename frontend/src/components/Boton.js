import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ALTO_TOQUE, colores, espacio, fuentes, radio } from "../theme";

const RADIO_MUESCA = 7;

// El primario tiene forma de entrada: una muesca a cada costado. Las muescas son círculos del color de lo que
// hay detrás del botón (`fondoDetras`): el fondo de la pantalla salvo que el botón esté dentro de un panel.
export default function Boton({
  titulo,
  onPress,
  variante = "primario",
  cargando = false,
  deshabilitado = false,
  fondoDetras = colores.fondo,
}) {
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
        <Text style={[estilos.texto, secundario && { color: colorDeTexto, fontFamily: fuentes.seminegrita }]}>
          {titulo}
        </Text>
      )}
      {secundario ? null : (
        <>
          <View style={[estilos.muesca, estilos.muescaIzquierda, { backgroundColor: fondoDetras }]} />
          <View style={[estilos.muesca, estilos.muescaDerecha, { backgroundColor: fondoDetras }]} />
        </>
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
    overflow: "hidden", // recorta la mitad de afuera de cada muesca
  },
  primario: { backgroundColor: colores.primario },
  peligro: { borderColor: colores.error },
  secundario: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.primario },
  presionado: { opacity: 0.85 },
  inactivo: { opacity: 0.5 },
  texto: { color: colores.textoSobrePrimario, fontSize: 16, letterSpacing: 0.2, fontFamily: fuentes.negrita },
  muesca: {
    position: "absolute",
    top: "50%",
    marginTop: -RADIO_MUESCA,
    width: RADIO_MUESCA * 2,
    height: RADIO_MUESCA * 2,
    borderRadius: RADIO_MUESCA,
  },
  muescaIzquierda: { left: -RADIO_MUESCA },
  muescaDerecha: { right: -RADIO_MUESCA },
});
