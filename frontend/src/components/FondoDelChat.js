import { useState } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { colores } from "../theme";
import { colorDelFondo } from "../utils/fondosChat";

// El fondo detrás de los mensajes: un color de la paleta o una imagen con una capa oscura encima, para que los
// separadores y los textos fuera de los globos se lean sobre cualquier foto (los globos ya son opacos).
// Si la imagen no se puede abrir (por ejemplo, se borró), queda el color de fondo.
export default function FondoDelChat({ fondo, style, children }) {
  const [fallo, setFallo] = useState(null); // uri de la imagen que no se pudo abrir

  if (fondo.tipo === "imagen" && fallo !== fondo.uri) {
    return (
      <ImageBackground
        source={{ uri: fondo.uri }}
        style={[style, { backgroundColor: colorDelFondo(fondo) }]}
        resizeMode="cover"
        onError={() => setFallo(fondo.uri)}
      >
        <View style={estilos.capa}>{children}</View>
      </ImageBackground>
    );
  }
  return <View style={[style, { backgroundColor: colorDelFondo(fondo) }]}>{children}</View>;
}

const estilos = StyleSheet.create({
  // Crece hasta llenar el chat y se achica a la pantalla (así la lista hace scroll); en la vista previa, mide lo
  // que su contenido.
  capa: { flexGrow: 1, flexShrink: 1, backgroundColor: colores.capaSobreChat },
});
