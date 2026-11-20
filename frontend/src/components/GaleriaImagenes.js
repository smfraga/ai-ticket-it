import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { API_URL } from "../config";
import { colores, espacio, fuentes, radio } from "../theme";
import { urlDeImagen } from "../utils/eventos";

const ALTO = 200;

// Las imágenes del evento (multimedia), deslizables de a una. Las que no cargan se ocultan;
// si no queda ninguna, no se muestra nada.
// Las imágenes adjuntas llegan como rutas del servidor: `urlDeImagen` les antepone su dirección.
export default function GaleriaImagenes({ urls = [] }) {
  const [ancho, setAncho] = useState(0);
  const [fallidas, setFallidas] = useState(() => new Set());
  const [actual, setActual] = useState(0);
  const visibles = urls.map((url) => urlDeImagen(url, API_URL)).filter((url) => url && !fallidas.has(url));

  if (visibles.length === 0) return null;

  const marcarFallida = (url) => setFallidas((previas) => new Set(previas).add(url));
  const alDesplazar = ({ nativeEvent }) => {
    if (ancho > 0) setActual(Math.round(nativeEvent.contentOffset.x / ancho));
  };

  return (
    <View style={estilos.contenedor} onLayout={({ nativeEvent }) => setAncho(nativeEvent.layout.width)}>
      {ancho > 0 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={alDesplazar}>
          {visibles.map((url, i) => (
            <Image
              key={url}
              source={{ uri: url }}
              style={[estilos.imagen, { width: ancho }]}
              resizeMode="cover"
              accessibilityLabel={`Imagen ${i + 1} de ${visibles.length} del evento`}
              accessibilityIgnoresInvertColors
              onError={() => marcarFallida(url)}
            />
          ))}
        </ScrollView>
      ) : null}
      {visibles.length > 1 ? (
        <Text style={estilos.contador}>
          {Math.min(actual, visibles.length - 1) + 1} / {visibles.length}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    height: ALTO,
    borderRadius: radio.tarjeta,
    overflow: "hidden",
    backgroundColor: colores.superficieAlta,
    marginBottom: espacio.s,
  },
  imagen: { height: ALTO },
  contador: {
    position: "absolute",
    right: espacio.s,
    bottom: espacio.s,
    paddingHorizontal: espacio.s,
    paddingVertical: 2,
    borderRadius: radio.pastilla,
    backgroundColor: colores.capaSobreFoto,
    color: colores.textoSobreCapa,
    fontSize: 13,
    fontFamily: fuentes.seminegrita,
  },
});
