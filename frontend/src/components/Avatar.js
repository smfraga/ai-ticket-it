import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { API_URL } from "../config";
import { colores, fuentes } from "../theme";
import { iniciales, urlDeFoto } from "../utils/perfil";

// La foto de perfil de una persona ({ nombre, apellido, foto }), o un círculo naranja con sus iniciales si no tiene
// o si la imagen no se puede abrir (por ejemplo, el backend se reinició y la foto ya no está).
export default function Avatar({ persona, tamanio = 48 }) {
  const url = urlDeFoto(persona.foto, API_URL);
  const [fallo, setFallo] = useState(null); // la URL que no se pudo abrir
  const forma = { width: tamanio, height: tamanio, borderRadius: tamanio / 2 };

  if (url && fallo !== url) {
    return (
      <Image
        source={{ uri: url }}
        style={[estilos.foto, forma]}
        accessibilityIgnoresInvertColors
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onError={() => setFallo(url)}
      />
    );
  }

  return (
    <View style={[estilos.circulo, forma]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[estilos.letras, { fontSize: tamanio * 0.45, lineHeight: tamanio * 0.5 }]}>
        {iniciales(persona)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  foto: { backgroundColor: colores.superficieAlta },
  circulo: { backgroundColor: colores.primario, alignItems: "center", justifyContent: "center" },
  letras: { fontFamily: fuentes.cartel, color: colores.textoSobrePrimario, paddingTop: 2 },
});
