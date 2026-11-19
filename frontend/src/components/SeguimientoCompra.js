import { StyleSheet, Text, View } from "react-native";
import { colores, espacio, fuentes, tipografia } from "../theme";
import { ETIQUETAS_DE_ESTADO, textoQuien } from "../utils/compras";
import { formatearFecha } from "../utils/formato";

// Línea de tiempo con cada cambio de estado de la compra (`historial`), del primero al último.
export default function SeguimientoCompra({ historial }) {
  return (
    <View>
      {historial.map((cambio, indice) => {
        const esElUltimo = indice === historial.length - 1;
        return (
          <View key={`${cambio.estado}-${cambio.fechaHora}-${indice}`} style={estilos.fila}>
            <View style={estilos.guia}>
              <View style={[estilos.punto, esElUltimo && estilos.puntoActual]} />
              {!esElUltimo ? <View style={estilos.linea} /> : null}
            </View>
            <View style={estilos.texto}>
              <Text style={[tipografia.cuerpo, esElUltimo && estilos.estadoActual]}>
                {ETIQUETAS_DE_ESTADO[cambio.estado] ?? cambio.estado}
              </Text>
              <Text style={tipografia.suave}>
                {formatearFecha(cambio.fechaHora)} · {textoQuien(cambio.quien)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const TAMANIO_PUNTO = 12;

const estilos = StyleSheet.create({
  fila: { flexDirection: "row", gap: espacio.m },
  guia: { alignItems: "center", width: TAMANIO_PUNTO },
  punto: {
    width: TAMANIO_PUNTO,
    height: TAMANIO_PUNTO,
    borderRadius: TAMANIO_PUNTO / 2,
    backgroundColor: colores.borde,
    marginTop: 5,
  },
  puntoActual: { backgroundColor: colores.primario },
  linea: { flex: 1, width: 2, backgroundColor: colores.borde, marginVertical: 2 },
  texto: { flex: 1, paddingBottom: espacio.m },
  estadoActual: { fontFamily: fuentes.negrita },
});
