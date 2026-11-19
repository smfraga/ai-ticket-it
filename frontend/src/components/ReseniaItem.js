import { StyleSheet, Text, View } from "react-native";
import { colores, espacio, radio, tipografia } from "../theme";
import { formatearEstrellas, formatearFechaCorta } from "../utils/formato";

export default function ReseniaItem({ resenia }) {
  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.fila}>
        <Text style={estilos.estrellas} accessibilityLabel={`${resenia.puntuacion} de 5`}>
          {formatearEstrellas(resenia.puntuacion)}
        </Text>
        <Text style={tipografia.suave}>{formatearFechaCorta(resenia.fecha)}</Text>
      </View>
      <Text style={tipografia.cuerpo}>{resenia.detalle}</Text>
      <Text style={tipografia.suave}>
        {resenia.autor.nombre} {resenia.autor.apellido} · {resenia.evento.nombre}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.l,
    gap: espacio.xs,
  },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  estrellas: { color: colores.aviso, fontSize: 16, letterSpacing: 1 },
});
