import { Pressable, StyleSheet, Text, View } from "react-native";
import { colores, espacio, radio, tipografia } from "../theme";
import { formatearFecha, formatearPrecio } from "../utils/formato";

const lugaresDisponibles = (evento) => evento.tiposEntrada.reduce((total, tipo) => total + tipo.disponibles, 0);

export default function EventoCard({ evento, onPress }) {
  const lugares = lugaresDisponibles(evento);
  const puntaje = evento.organizador.puntaje;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
    >
      <View style={estilos.fila}>
        <Text style={estilos.categoria}>{evento.categoria.nombre}</Text>
        <Text style={estilos.puntaje}>{puntaje === null ? "Sin reseñas" : `★ ${puntaje.toFixed(1)}`}</Text>
      </View>
      <Text style={tipografia.subtitulo}>{evento.nombre}</Text>
      <Text style={tipografia.suave}>{formatearFecha(evento.fecha)}</Text>
      <Text style={tipografia.suave}>
        {evento.organizador.nombre} {evento.organizador.apellido}
      </Text>
      <View style={estilos.fila}>
        <Text style={estilos.precio}>Desde {formatearPrecio(evento.precioDesde)}</Text>
        <Text style={[tipografia.suave, lugares === 0 && estilos.agotado]}>
          {lugares === 0 ? "Agotado" : `${lugares} ${lugares === 1 ? "lugar" : "lugares"}`}
        </Text>
      </View>
    </Pressable>
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
  presionada: { opacity: 0.85 },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoria: { color: colores.primarioOscuro, fontSize: 13, fontWeight: "600" },
  puntaje: { color: colores.textoSuave, fontSize: 13 },
  precio: { color: colores.texto, fontSize: 16, fontWeight: "700", marginTop: espacio.xs },
  agotado: { color: colores.error, fontWeight: "600" },
});
