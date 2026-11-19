import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colores, espacio, fuentes, radio, tipografia } from "../theme";
import { formatearFecha, formatearPrecio } from "../utils/formato";
import BotonFavorito from "./BotonFavorito";

const ALTO_DE_IMAGEN = 140;

const lugaresDisponibles = (evento) => evento.tiposEntrada.reduce((total, tipo) => total + tipo.disponibles, 0);

// `favorito` y `onAlternarFavorito` son opcionales: sin ellos la tarjeta no muestra el corazón
// (por ejemplo, para un organizador o en Mis eventos).
export default function EventoCard({ evento, onPress, favorito, onAlternarFavorito }) {
  const lugares = lugaresDisponibles(evento);
  const puntaje = evento.organizador.puntaje;
  const conCorazon = typeof onAlternarFavorito === "function";
  // La primera imagen del evento, si tiene. Si no carga (URL rota, sin internet), la tarjeta queda sin imagen.
  const [imagenFallo, setImagenFallo] = useState(false);
  const imagen = evento.multimedia?.[0];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
    >
      {imagen && !imagenFallo ? (
        <Image
          source={{ uri: imagen }}
          style={estilos.imagen}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          onError={() => setImagenFallo(true)}
        />
      ) : null}
      <View style={estilos.fila}>
        <Text style={estilos.categoria}>{evento.categoria.nombre}</Text>
        <Text style={estilos.puntaje}>{puntaje === null ? "Sin reseñas" : `★ ${puntaje.toFixed(1)}`}</Text>
      </View>
      <View style={estilos.fila}>
        <Text style={[tipografia.subtitulo, estilos.nombre]}>{evento.nombre}</Text>
        {conCorazon ? (
          <BotonFavorito favorito={Boolean(favorito)} onPress={() => onAlternarFavorito(evento.id)} />
        ) : null}
      </View>
      <Text style={tipografia.suave}>{formatearFecha(evento.fecha)}</Text>
      <Text style={tipografia.suave}>
        {evento.organizador.nombre} {evento.organizador.apellido}
      </Text>
      <View style={estilos.fila}>
        <Text style={estilos.precio}>Desde {formatearPrecio(evento.precioDesde)}</Text>
        {evento.cancelado ? (
          <Text style={estilos.cancelado}>Cancelado</Text>
        ) : evento.yaPaso ? (
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
    overflow: "hidden", // la imagen respeta las esquinas redondeadas
  },
  // Ocupa todo el ancho de la tarjeta: se come el padding de arriba y de los costados.
  imagen: {
    height: ALTO_DE_IMAGEN,
    marginTop: -espacio.l,
    marginHorizontal: -espacio.l,
    marginBottom: espacio.s,
    backgroundColor: colores.primarioSuave,
  },
  presionada: { opacity: 0.85 },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nombre: { flex: 1 },
  categoria: { color: colores.primarioOscuro, fontSize: 13, fontFamily: fuentes.seminegrita },
  puntaje: { fontFamily: fuentes.regular, color: colores.textoSuave, fontSize: 13 },
  precio: { color: colores.texto, fontSize: 16, fontFamily: fuentes.negrita, marginTop: espacio.xs },
  agotado: { color: colores.error, fontFamily: fuentes.seminegrita },
  cancelado: { color: colores.error, fontSize: 15, fontFamily: fuentes.negrita },
});
