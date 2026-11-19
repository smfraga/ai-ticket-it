import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { mensajeDeError } from "../services/api";
import { comprar } from "../services/comprasService";
import { colores, espacio, fuentes, radio, tipografia } from "../theme";
import { formatearPrecio } from "../utils/formato";
import Boton from "./Boton";
import SelectorCantidad from "./SelectorCantidad";

const textoDeEntradas = (cantidad) => `${cantidad} ${cantidad === 1 ? "entrada" : "entradas"}`;

// Compra del tipo de entrada elegido. El padre lo monta con `key={tipo.id}` para que al cambiar de tipo arranque de cero.
export default function PanelCompra({ eventoId, tipo, onComprada, onTerminar }) {
  const [cantidad, setCantidad] = useState(1);
  const [comprando, setComprando] = useState(false);
  const [error, setError] = useState(null);
  const [compra, setCompra] = useState(null);

  // Si el cupo bajó mientras tanto (otra compra), no se puede pedir más de lo que queda.
  const maximo = Math.max(tipo.disponibles, 1);
  const cantidadValida = Math.min(cantidad, maximo);
  const total = tipo.precio * cantidadValida;

  const confirmar = async () => {
    setError(null);
    setComprando(true);
    try {
      const hecha = await comprar(eventoId, { tipoEntradaId: tipo.id, cantidad: cantidadValida });
      setCompra(hecha);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setComprando(false);
      onComprada(); // en cualquier caso, que el detalle vuelva a pedir los lugares que quedan
    }
  };

  const pedirConfirmacion = () =>
    Alert.alert(
      "Confirmar compra",
      `${textoDeEntradas(cantidadValida)} de ${tipo.nombre} por ${formatearPrecio(total)}.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Comprar", onPress: confirmar },
      ],
    );

  if (compra) {
    return (
      <View style={[estilos.panel, estilos.exito]}>
        <Text style={estilos.tituloExito}>¡Compra confirmada!</Text>
        <Text style={tipografia.cuerpo}>
          {textoDeEntradas(compra.cantidad)} de {compra.tipoEntrada.nombre} para {compra.evento.nombre}.
        </Text>
        <Text style={tipografia.subtitulo}>Total {formatearPrecio(compra.total)}</Text>
        {compra.diasRestantes !== null ? (
          <Text style={tipografia.suave}>
            {compra.diasRestantes === 0
              ? "El evento es hoy."
              : `Faltan ${compra.diasRestantes} ${compra.diasRestantes === 1 ? "día" : "días"}.`}
          </Text>
        ) : null}
        <Boton titulo="Seguir viendo el evento" variante="secundario" onPress={onTerminar} />
      </View>
    );
  }

  if (tipo.disponibles === 0) {
    return (
      <View style={estilos.panel}>
        <Text style={tipografia.subtitulo}>{tipo.nombre}</Text>
        {error ? <Text style={estilos.error}>{error}</Text> : null}
        <Text style={tipografia.cuerpo}>Se agotaron las entradas de este tipo. Elegí otro.</Text>
      </View>
    );
  }

  return (
    <View style={estilos.panel}>
      <Text style={tipografia.subtitulo}>{tipo.nombre}</Text>
      <View style={estilos.fila}>
        <Text style={tipografia.cuerpo}>Cantidad</Text>
        <SelectorCantidad valor={cantidadValida} onCambiar={setCantidad} maximo={maximo} />
      </View>
      <View style={estilos.fila}>
        <Text style={tipografia.cuerpo}>Total</Text>
        <Text style={estilos.total}>{formatearPrecio(total)}</Text>
      </View>
      {error ? <Text style={estilos.error}>{error}</Text> : null}
      <Boton titulo="Comprar" onPress={pedirConfirmacion} cargando={comprando} fondoDetras={colores.primarioSuave} />
    </View>
  );
}

const estilos = StyleSheet.create({
  panel: {
    gap: espacio.m,
    backgroundColor: colores.primarioSuave,
    borderRadius: radio.tarjeta,
    borderWidth: 1,
    borderColor: colores.primario,
    padding: espacio.l,
  },
  exito: { backgroundColor: colores.exitoSuave, borderColor: colores.exito },
  tituloExito: { fontSize: 20, fontFamily: fuentes.negrita, color: colores.exito },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  total: { fontSize: 22, fontFamily: fuentes.negrita, color: colores.texto },
  error: { color: colores.error, fontSize: 14, fontFamily: fuentes.seminegrita },
});
