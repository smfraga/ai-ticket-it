import { Pressable, StyleSheet, Text, View } from "react-native";
import { colores, espacio, radio, tipografia } from "../theme";
import { textoDiasRestantes, textoEntradas } from "../utils/compras";
import { formatearFecha, formatearFechaCorta, formatearPrecio } from "../utils/formato";
import EstadoCompra from "./EstadoCompra";

export default function CompraCard({ compra, onPress }) {
  const dias = textoDiasRestantes(compra.diasRestantes);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre el detalle de la compra"
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
    >
      <EstadoCompra estado={compra.estado} />
      <Text style={tipografia.subtitulo}>{compra.evento.nombre}</Text>
      <Text style={tipografia.suave}>{formatearFecha(compra.evento.fecha)}</Text>
      {dias ? <Text style={estilos.dias}>{dias}</Text> : null}
      <View style={estilos.fila}>
        <Text style={tipografia.cuerpo}>
          {textoEntradas(compra.cantidad)} · {compra.tipoEntrada.nombre}
        </Text>
        <Text style={estilos.total}>{formatearPrecio(compra.total)}</Text>
      </View>
      <Text style={tipografia.suave}>Comprada el {formatearFechaCorta(compra.fecha)}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.l,
    gap: espacio.xs,
  },
  presionada: { opacity: 0.85 },
  dias: { color: colores.exito, fontSize: 15, fontWeight: "700" },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: espacio.xs },
  total: { fontSize: 16, fontWeight: "700", color: colores.texto },
});
