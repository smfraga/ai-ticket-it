import { Pressable, StyleSheet, Text, View } from "react-native";
import { colores, espacio, radio, tipografia } from "../theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { textoDiasRestantes, textoEntradas, textoMensajesNuevos, textoPlazoDePagoCorto } from "../utils/compras";
import { formatearFecha, formatearFechaCorta, formatearPrecio } from "../utils/formato";
import EstadoCompra from "./EstadoCompra";

// `mostrarComprador`: en la vista del organizador, cada compra dice de quién es.
export default function CompraCard({ compra, onPress, mostrarComprador = false }) {
  const dias = textoDiasRestantes(compra.diasRestantes);
  const mensajesNuevos = textoMensajesNuevos(compra.mensajesNoLeidos);
  // Solo en Mis compras: el organizador ve el plazo en el detalle.
  const plazo = mostrarComprador ? null : textoPlazoDePagoCorto(compra);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre el detalle de la compra"
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
    >
      <View style={estilos.cabecera}>
        <EstadoCompra estado={compra.estado} />
        {mensajesNuevos ? (
          <View style={estilos.insignia} accessibilityLabel={mensajesNuevos}>
            <Ionicons name="chatbubble" size={13} color={colores.textoSobrePrimario} />
            <Text style={estilos.textoInsignia}>{mensajesNuevos}</Text>
          </View>
        ) : null}
      </View>
      {mostrarComprador ? (
        <Text style={tipografia.subtitulo}>
          {compra.comprador.nombre} {compra.comprador.apellido}
        </Text>
      ) : (
        <>
          <Text style={tipografia.subtitulo}>{compra.evento.nombre}</Text>
          <Text style={tipografia.suave}>{formatearFecha(compra.evento.fecha)}</Text>
          {compra.evento.cancelado ? <Text style={estilos.cancelado}>El organizador canceló el evento</Text> : null}
        </>
      )}
      {dias ? <Text style={estilos.dias}>{dias}</Text> : null}
      {plazo ? <Text style={estilos.plazo}>{plazo}</Text> : null}
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
  cabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacio.s },
  insignia: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.xs,
    backgroundColor: colores.primario,
    borderRadius: 999,
    paddingHorizontal: espacio.s,
    paddingVertical: 3,
  },
  textoInsignia: { color: colores.textoSobrePrimario, fontSize: 13, fontWeight: "700" },
  dias: { color: colores.exito, fontSize: 15, fontWeight: "700" },
  cancelado: { color: colores.error, fontSize: 15, fontWeight: "700" },
  plazo: { color: colores.aviso, fontSize: 15, fontWeight: "600" },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: espacio.xs },
  total: { fontSize: 16, fontWeight: "700", color: colores.texto },
});
