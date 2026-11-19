import { Pressable, StyleSheet, Text, View } from "react-native";
import { colores, espacio, radio, tipografia } from "../theme";
import { formatearFecha, formatearPrecio } from "../utils/formato";
import BotonFavorito from "./BotonFavorito";

const lugaresDisponibles = (evento) => evento.tiposEntrada.reduce((total, tipo) => total + tipo.disponibles, 0);

// `favorito` y `onAlternarFavorito` son opcionales: sin ellos la tarjeta no muestra el corazón
// (por ejemplo, para un organizador o en Mis eventos).
export default function EventoCard({ evento, onPress, favorito, onAlternarFavorito }) {
  const lugares = lugaresDisponibles(evento);
  const puntaje = evento.organizador.puntaje;
  const conCorazon = typeof onAlternarFavorito === "function";

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
      <View style={estilos.fila}>
        <Text style={[tipografia.subtitulo, estilos.nombre]}>{evento.nombre}</Text>
        {conCorazon ? <BotonFavorito favorito={Boolean(favorito)} onPress={() => onAlternarFavorito(evento.id)} /> : null}
      </View>
      <Text style={tipografia.suave}>{formatearFecha(evento.fecha)}</Text>
      <Text style={tipografia.suave}>
        {evento.organizador.nombre} {evento.organizador.apellido}
      </Text>
      <View style={estilos.fila}>
        <Text style={estilos.precio}>Desde {formatearPrecio(evento.precioDesde)}</Text>
        {evento.yaPaso ? (
          <Text style={tipografia.suave}>Ya se realizó</Text>
        ) : (
          <Text style={[tipografia.suave, lugares === 0 && estilos.agotado]}>
            {lugares === 0 ? "Agotado" : `${lugares} ${lugares === 1 ? "lugar" : "lugares"}`}
          </Text>
        )}
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
  nombre: { flex: 1 },
  categoria: { color: colores.primarioOscuro, fontSize: 13, fontWeight: "600" },
  puntaje: { color: colores.textoSuave, fontSize: 13 },
  precio: { color: colores.texto, fontSize: 16, fontWeight: "700", marginTop: espacio.xs },
  agotado: { color: colores.error, fontWeight: "600" },
});
