import { StyleSheet, Text, TextInput, View } from "react-native";
import { ALTO_TOQUE, colores, espacio, radio, tipografia } from "../theme";

// `style` se suma al del campo (por ejemplo, para un campo de varias líneas) en lugar de reemplazarlo.
export default function CampoTexto({ etiqueta, error, style, ...props }) {
  return (
    <View style={estilos.contenedor}>
      {etiqueta ? <Text style={tipografia.etiqueta}>{etiqueta}</Text> : null}
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={colores.textoSuave}
        style={[estilos.input, error && estilos.inputConError, style]}
        {...props}
      />
      {error ? <Text style={estilos.error}>{error}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espacio.xs },
  input: {
    minHeight: ALTO_TOQUE,
    paddingHorizontal: espacio.m,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.control,
    backgroundColor: colores.superficie,
    fontSize: 16,
    color: colores.texto,
  },
  inputConError: { borderColor: colores.error },
  error: { color: colores.error, fontSize: 13 },
});
