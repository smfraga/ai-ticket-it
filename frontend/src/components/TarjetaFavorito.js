import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { API_URL } from "../config";
import { colores, espacio, fuentes, radio } from "../theme";
import { avisoDeCupo, textoCuentaRegresiva, urlDeImagen } from "../utils/eventos";
import { formatearFecha } from "../utils/formato";
import BotonFavorito from "./BotonFavorito";

// Tarjeta de la grilla de Favoritos (dos columnas): foto grande con el corazón y el aviso de cupo encima, y abajo
// el nombre, la fecha y cuánto falta. `ancho` lo calcula la pantalla para que las dos columnas midan lo mismo
// aunque la cantidad sea impar.
export default function TarjetaFavorito({ evento, ancho, onPress, onQuitar }) {
  const [imagenFallo, setImagenFallo] = useState(false);
  const imagen = urlDeImagen(evento.multimedia?.[0], API_URL);
  const apagada = evento.cancelado || evento.yaPaso;
  const cuenta = textoCuentaRegresiva(evento);
  const aviso = avisoDeCupo(evento);
  const altoDeImagen = Math.round(ancho * 0.85);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[evento.nombre, formatearFecha(evento.fecha), cuenta, aviso].filter(Boolean).join(", ")}
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, { width: ancho }, pressed && estilos.presionada]}
    >
      <View style={[estilos.marcoImagen, { height: altoDeImagen }]}>
        {imagen && !imagenFallo ? (
          <Image
            source={{ uri: imagen }}
            style={[StyleSheet.absoluteFill, apagada && estilos.imagenApagada]}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            onError={() => setImagenFallo(true)}
          />
        ) : (
          // Sin foto (o si no carga): la categoría en letra de cartel.
          <Text style={estilos.sinImagen} numberOfLines={2}>
            {evento.categoria.nombre.toUpperCase()}
          </Text>
        )}
        <View style={estilos.corazon}>
          <BotonFavorito favorito onPress={() => onQuitar(evento.id)} tamanio={20} />
        </View>
        {aviso ? (
          <Text style={[estilos.aviso, aviso === "Agotado" ? estilos.avisoAgotado : estilos.avisoPocas]}>{aviso}</Text>
        ) : null}
      </View>
      <View style={estilos.info}>
        <Text style={estilos.categoria} numberOfLines={1}>
          {evento.categoria.nombre.toUpperCase()}
        </Text>
        <Text style={estilos.nombre} numberOfLines={2}>
          {evento.nombre}
        </Text>
        <Text style={estilos.fecha} numberOfLines={1}>
          {formatearFecha(evento.fecha)}
        </Text>
        <Text
          style={[estilos.cuenta, evento.cancelado ? estilos.cuentaCancelado : apagada && estilos.cuentaRealizado]}
          numberOfLines={1}
        >
          {cuenta}
        </Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    borderRadius: radio.tarjeta,
    overflow: "hidden",
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  presionada: { opacity: 0.8 },
  marcoImagen: { backgroundColor: colores.superficieAlta, justifyContent: "center", alignItems: "center" },
  imagenApagada: { opacity: 0.45 },
  sinImagen: {
    fontFamily: fuentes.cartel,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: 1,
    color: colores.bordeControl,
    textAlign: "center",
    paddingHorizontal: espacio.s,
  },
  // Círculo oscuro detrás del corazón para que se lea sobre cualquier foto.
  corazon: {
    position: "absolute",
    top: espacio.xs,
    right: espacio.xs,
    borderRadius: radio.pastilla,
    backgroundColor: colores.capaSobreFoto,
  },
  aviso: {
    position: "absolute",
    left: espacio.s,
    bottom: espacio.s,
    paddingHorizontal: espacio.s,
    paddingVertical: 2,
    borderRadius: radio.pastilla,
    overflow: "hidden",
    fontSize: 12,
    fontFamily: fuentes.seminegrita,
    color: colores.textoSobrePrimario,
  },
  avisoPocas: { backgroundColor: colores.aviso },
  avisoAgotado: { backgroundColor: colores.error },
  info: { padding: espacio.s, gap: 2 },
  categoria: { color: colores.primarioOscuro, fontSize: 11, letterSpacing: 1, fontFamily: fuentes.seminegrita },
  // Alto fijo de dos líneas: las dos tarjetas de una fila miden lo mismo aunque un nombre sea corto.
  nombre: {
    fontFamily: fuentes.cartel,
    fontSize: 21,
    lineHeight: 22,
    minHeight: 44,
    letterSpacing: 0.3,
    color: colores.texto,
  },
  fecha: { fontFamily: fuentes.regular, fontSize: 12, color: colores.textoSuave },
  cuenta: { fontFamily: fuentes.seminegrita, fontSize: 14, color: colores.primario, marginTop: 2 },
  cuentaRealizado: { color: colores.textoSuave },
  cuentaCancelado: { color: colores.error },
});
