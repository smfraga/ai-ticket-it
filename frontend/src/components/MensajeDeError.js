import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, Text } from "react-native";
import { colores, fuentes } from "../theme";

// Un mensaje de error que aparece después de una acción (enviar un formulario, comprar, cargar). Quien no ve la
// pantalla también se entera: en iOS se anuncia con VoiceOver cada vez que el mensaje cambia, y en Android lo lee
// TalkBack por la región en vivo. Es el equivalente de `role="alert"` en la web (pauta de mensajes dinámicos).
export default function MensajeDeError({ mensaje, style }) {
  useEffect(() => {
    if (mensaje) AccessibilityInfo.announceForAccessibility(mensaje);
  }, [mensaje]);

  if (!mensaje) return null;
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[estilos.error, style]}>
      {mensaje}
    </Text>
  );
}

const estilos = StyleSheet.create({
  error: { fontFamily: fuentes.regular, color: colores.error, fontSize: 14 },
});
