import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colores, espacio, tipografia } from "../theme";
import Boton from "./Boton";
import MensajeDeError from "./MensajeDeError";

// Pantalla de carga, vacío o error con reintento. La carga tiene etiqueta ("Cargando") y el error se anuncia.
export default function Estado({ tipo, mensaje, onReintentar }) {
  return (
    <View style={estilos.contenedor}>
      {tipo === "cargando" ? (
        <ActivityIndicator size="large" color={colores.primario} accessibilityLabel="Cargando" />
      ) : null}
      {tipo === "error" ? (
        <MensajeDeError mensaje={mensaje} style={[tipografia.cuerpo, estilos.mensaje, estilos.mensajeError]} />
      ) : mensaje ? (
        <Text style={[tipografia.cuerpo, estilos.mensaje]}>{mensaje}</Text>
      ) : null}
      {tipo === "error" && onReintentar ? (
        <Boton titulo="Reintentar" variante="secundario" onPress={onReintentar} />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: espacio.xxl,
    gap: espacio.l,
    backgroundColor: colores.fondo,
  },
  mensaje: { textAlign: "center" },
  mensajeError: { color: colores.error },
});
