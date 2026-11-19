import { StyleSheet, Text, View } from "react-native";
import { colores, espacio, fuentes, tipografia } from "../theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  esEntradaVigente,
  textoDiasRestantes,
  textoEntradas,
  textoMensajesNuevos,
  textoPlazoDePagoCorto,
} from "../utils/compras";
import { formatearFechaCorta, formatearPrecio } from "../utils/formato";
import Entrada from "./Entrada";
import EstadoCompra from "./EstadoCompra";

// `mostrarComprador`: en la vista del organizador, cada compra dice de quién es.
export default function CompraCard({ compra, onPress, mostrarComprador = false }) {
  const dias = textoDiasRestantes(compra.diasRestantes);
  const mensajesNuevos = textoMensajesNuevos(compra.mensajesNoLeidos);
  // Solo en Mis compras: el organizador ve el plazo en el detalle.
  const plazo = mostrarComprador ? null : textoPlazoDePagoCorto(compra);

  // El talón lleva la fecha del evento; en la vista del organizador todas son del mismo evento, así que no va.
  // Gris si la entrada ya no sirve para entrar (usada, cancelada, reembolsada o evento cancelado).
  const apagada = !esEntradaVigente(compra);

  return (
    <Entrada
      fecha={mostrarComprador ? null : compra.evento.fecha}
      apagada={apagada}
      onPress={onPress}
      accessibilityHint="Abre el detalle de la compra"
    >
      <View style={estilos.contenido}>
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
            <Text style={tipografia.tituloTarjeta}>{compra.evento.nombre}</Text>
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
      </View>
    </Entrada>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espacio.m, gap: espacio.xs },
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
  textoInsignia: { color: colores.textoSobrePrimario, fontSize: 13, fontFamily: fuentes.negrita },
  dias: { color: colores.exito, fontSize: 15, fontFamily: fuentes.negrita },
  cancelado: { color: colores.error, fontSize: 15, fontFamily: fuentes.negrita },
  plazo: { color: colores.aviso, fontSize: 15, fontFamily: fuentes.seminegrita },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: espacio.xs },
  total: { fontSize: 16, fontFamily: fuentes.negrita, color: colores.texto },
});
