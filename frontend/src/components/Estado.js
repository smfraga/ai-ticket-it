import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colores, espacio, tipografia } from "../theme";
import Boton from "./Boton";

// Pantalla de carga, vacío o error con reintento.
export default function Estado({ tipo, mensaje, onReintentar }) {
  return (
    <View style={estilos.contenedor}>
      {tipo === "cargando" ? <ActivityIndicator size="large" color={colores.primario} /> : null}
      {mensaje ? <Text style={[tipografia.cuerpo, estilos.mensaje, tipo === "error" && estilos.mensajeError]}>{mensaje}</Text> : null}
      {tipo === "error" && onReintentar ? <Boton titulo="Reintentar" variante="secundario" onPress={onReintentar} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, alignItems: "center", justifyContent: "center", padding: espacio.xxl, gap: espacio.l },
  mensaje: { textAlign: "center" },
  mensajeError: { color: colores.error },
});
