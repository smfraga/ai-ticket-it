import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colores, espacio, fuentes, radio } from "../theme";
import { partesDeFecha } from "../utils/formato";

const ANCHO_TALON = 56;
const RADIO_MUESCA = 9;
const ALTO_TRAZO = 6;
const SEPARACION_TRAZO = 5;

// Tarjeta con forma de entrada: a la izquierda el talón con la fecha (como en una entrada impresa), una línea
// perforada y dos muescas. `apagada` pinta el talón gris (evento ya realizado o cancelado). Sin `fecha`, es una
// tarjeta común con el mismo fondo y esquinas.
export default function Entrada({ fecha, apagada = false, onPress, accessibilityHint, children }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
    >
      {fecha ? (
        <>
          <Talon fecha={fecha} apagada={apagada} />
          <Perforado />
        </>
      ) : null}
      <View style={estilos.cuerpo}>{children}</View>
      {fecha ? (
        <>
          <View style={[estilos.muesca, estilos.muescaArriba]} />
          <View style={[estilos.muesca, estilos.muescaAbajo]} />
        </>
      ) : null}
    </Pressable>
  );
}

function Talon({ fecha, apagada }) {
  const { diaSemana, dia, mes, hora } = partesDeFecha(fecha);
  const colorTexto = apagada ? colores.textoSuave : colores.textoSobrePrimario;

  return (
    <View
      style={[estilos.talon, apagada && estilos.talonApagado]}
      accessible
      accessibilityLabel={`${diaSemana} ${dia} ${mes}, ${hora}`}
    >
      <Text style={[estilos.diaSemana, { color: colorTexto }]}>{diaSemana}</Text>
      <Text style={[estilos.dia, { color: colorTexto }]}>{dia}</Text>
      <Text style={[estilos.mes, { color: colorTexto }]}>{mes}</Text>
      <Text style={[estilos.hora, { color: colorTexto }]}>{hora}</Text>
    </View>
  );
}

// iOS no dibuja un borde punteado en un solo lado: la línea se arma con trazos según el alto de la tarjeta.
function Perforado() {
  const [alto, setAlto] = useState(0);
  const cantidad = Math.max(0, Math.floor((alto - 2 * RADIO_MUESCA) / (ALTO_TRAZO + SEPARACION_TRAZO)));

  return (
    <View style={estilos.perforado} onLayout={(e) => setAlto(e.nativeEvent.layout.height)}>
      {Array.from({ length: cantidad }, (_, i) => (
        <View key={i} style={estilos.trazo} />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: "row",
    backgroundColor: colores.superficie,
    borderRadius: radio.tarjeta,
    overflow: "hidden", // las esquinas recortan la imagen y medio círculo de cada muesca
  },
  presionada: { opacity: 0.85 },
  talon: {
    width: ANCHO_TALON,
    backgroundColor: colores.primario,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: espacio.s,
  },
  talonApagado: { backgroundColor: colores.superficieAlta },
  diaSemana: { fontFamily: fuentes.seminegrita, fontSize: 11, letterSpacing: 1 },
  dia: { fontFamily: fuentes.cartel, fontSize: 30, lineHeight: 32 },
  mes: { fontFamily: fuentes.seminegrita, fontSize: 11, letterSpacing: 1 },
  hora: { fontFamily: fuentes.regular, fontSize: 11, marginTop: 2 },
  perforado: {
    width: 2,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: RADIO_MUESCA,
    backgroundColor: colores.superficie,
  },
  trazo: { width: 2, height: ALTO_TRAZO, borderRadius: 1, backgroundColor: colores.bordeControl },
  cuerpo: { flex: 1, minWidth: 0 },
  muesca: {
    position: "absolute",
    left: ANCHO_TALON + 1 - RADIO_MUESCA,
    width: RADIO_MUESCA * 2,
    height: RADIO_MUESCA * 2,
    borderRadius: RADIO_MUESCA,
    backgroundColor: colores.fondo,
  },
  muescaArriba: { top: -RADIO_MUESCA },
  muescaAbajo: { bottom: -RADIO_MUESCA },
});
