import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { API_URL } from "../config";
import { colores, espacio, fuentes, radio, tipografia } from "../theme";
import { urlDeImagen } from "../utils/eventos";
import { formatearPrecio } from "../utils/formato";
import BotonFavorito from "./BotonFavorito";
import Entrada from "./Entrada";

const ALTO_DE_IMAGEN = 84;

const lugaresDisponibles = (evento) => evento.tiposEntrada.reduce((total, tipo) => total + tipo.disponibles, 0);

// `favorito` y `onAlternarFavorito` son opcionales: sin ellos la tarjeta no muestra el corazón
// (por ejemplo, para un organizador o en Mis eventos). La fecha va en el talón de la entrada.
export default function EventoCard({ evento, onPress, favorito, onAlternarFavorito }) {
  const lugares = lugaresDisponibles(evento);
  const puntaje = evento.organizador.puntaje;
  const conCorazon = typeof onAlternarFavorito === "function";
  // La primera imagen del evento, si tiene. Si no carga (URL rota, sin internet), la tarjeta queda sin imagen.
  const [imagenFallo, setImagenFallo] = useState(false);
  const imagen = urlDeImagen(evento.multimedia?.[0], API_URL);
  const cantidadDeImagenes = evento.multimedia?.length ?? 0;

  return (
    <Entrada fecha={evento.fecha} apagada={evento.cancelado || evento.yaPaso} onPress={onPress}>
      {imagen && !imagenFallo ? (
        <View>
          <Image
            source={{ uri: imagen }}
            style={estilos.imagen}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            onError={() => setImagenFallo(true)}
          />
          {cantidadDeImagenes > 1 ? (
            // Las demás se deslizan en el detalle del evento.
            <Text style={estilos.contador} accessibilityLabel={`${cantidadDeImagenes} imágenes`}>
              1/{cantidadDeImagenes}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={estilos.info}>
        <View style={estilos.fila}>
          <Text style={estilos.categoria}>{evento.categoria.nombre.toUpperCase()}</Text>
          <Text style={estilos.puntaje}>{puntaje === null ? "Sin reseñas" : `★ ${puntaje.toFixed(1)}`}</Text>
        </View>
        <View style={[estilos.fila, estilos.filaNombre]}>
          <Text style={[tipografia.tituloTarjeta, estilos.nombre]}>{evento.nombre}</Text>
          {conCorazon ? (
            <BotonFavorito favorito={Boolean(favorito)} onPress={() => onAlternarFavorito(evento.id)} />
          ) : null}
        </View>
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
      </View>
    </Entrada>
  );
}

const estilos = StyleSheet.create({
  imagen: { height: ALTO_DE_IMAGEN, backgroundColor: colores.superficieAlta },
  info: { paddingHorizontal: espacio.m, paddingVertical: espacio.s, gap: 1 },
  contador: {
    position: "absolute",
    right: espacio.s,
    bottom: espacio.s,
    paddingHorizontal: espacio.s,
    paddingVertical: 1,
    borderRadius: radio.pastilla,
    backgroundColor: colores.capaSobreFoto,
    color: colores.textoSobreCapa,
    fontSize: 12,
    fontFamily: fuentes.seminegrita,
  },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacio.s },
  filaNombre: { alignItems: "flex-start" },
  nombre: { flex: 1, marginTop: 2 },
  categoria: { color: colores.primarioOscuro, fontSize: 12, letterSpacing: 1, fontFamily: fuentes.seminegrita },
  puntaje: { fontFamily: fuentes.regular, color: colores.textoSuave, fontSize: 13 },
  precio: { color: colores.texto, fontSize: 15, fontFamily: fuentes.negrita, marginTop: 2 },
  agotado: { color: colores.error, fontFamily: fuentes.seminegrita },
  cancelado: { color: colores.error, fontSize: 15, fontFamily: fuentes.negrita },
});
