import { StyleSheet, Text, TextInput, View } from "react-native";
import { ALTO_TOQUE, colores, espacio, fuentes, radio, tipografia } from "../theme";

// `style` se suma al del campo (por ejemplo, para un campo de varias líneas) en lugar de reemplazarlo.
// Con `error`, el borde se pone rojo, el mensaje aparece debajo y queda asociado al campo: el lector de pantalla lo
// lee después de la etiqueta (el equivalente de `aria-invalid` y `aria-describedby` en la web).
export default function CampoTexto({ etiqueta, error, style, ...props }) {
  return (
    <View style={estilos.contenedor}>
      {etiqueta ? (
        <Text style={tipografia.etiqueta} importantForAccessibility="no" accessibilityElementsHidden>
          {etiqueta}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={error ? `${etiqueta}, con error` : etiqueta}
        accessibilityHint={error || undefined}
        placeholderTextColor={colores.textoPlaceholder}
        style={[estilos.input, error && estilos.inputConError, style]}
        {...props}
      />
      {/* El mensaje ya lo lee el campo: se oculta para no repetirlo. */}
      {error ? (
        <Text style={estilos.error} importantForAccessibility="no" accessibilityElementsHidden>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espacio.xs },
  input: {
    minHeight: ALTO_TOQUE,
    paddingHorizontal: espacio.m,
    borderWidth: 1,
    borderColor: colores.bordeControl,
    borderRadius: radio.control,
    backgroundColor: colores.superficie,
    fontFamily: fuentes.regular,
    fontSize: 16,
    color: colores.texto,
  },
  inputConError: { borderColor: colores.error, borderWidth: 2 },
  error: { fontFamily: fuentes.regular, color: colores.error, fontSize: 13 },
});
