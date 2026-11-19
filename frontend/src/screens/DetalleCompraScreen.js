import { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Boton from "../components/Boton";
import Estado from "../components/Estado";
import EstadoCompra from "../components/EstadoCompra";
import SeguimientoCompra from "../components/SeguimientoCompra";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { cancelarCompra, obtenerCompra } from "../services/comprasService";
import { colores, espacio, radio, tipografia } from "../theme";
import {
  motivoSinCancelacion,
  puedeCancelar,
  textoDeConfirmacionDeCancelacion,
  textoDiasRestantes,
  textoEntradas,
} from "../utils/compras";
import { formatearFecha, formatearFechaCorta, formatearPrecio } from "../utils/formato";

const AVISO_REEMBOLSADA = "Compra cancelada. Se reembolsó el total y las entradas volvieron al cupo.";
const AVISO_CANCELADA = "Compra cancelada. Las entradas volvieron al cupo.";

export default function DetalleCompraScreen({ route, navigation }) {
  const { compraId } = route.params;
  const [compra, setCompra] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [errorDeCancelar, setErrorDeCancelar] = useState(null);
  const [aviso, setAviso] = useState(null);
  const nuevoPedido = useUltimoPedido();

  const cargar = useCallback(async () => {
    const esVigente = nuevoPedido();
    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerCompra(compraId);
      if (esVigente()) setCompra(datos);
    } catch (e) {
      if (esVigente()) setError(mensajeDeError(e));
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [compraId, nuevoPedido]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cancelar = async () => {
    setErrorDeCancelar(null);
    setCancelando(true);
    try {
      const cancelada = await cancelarCompra(compraId);
      setAviso(cancelada.estado === "REEMBOLSADA" ? AVISO_REEMBOLSADA : AVISO_CANCELADA);
    } catch (e) {
      setErrorDeCancelar(mensajeDeError(e));
    } finally {
      setCancelando(false);
      cargar(); // en cualquier caso, que la pantalla muestre el estado real (incluso tras un 409)
    }
  };

  const pedirConfirmacion = () =>
    Alert.alert("Cancelar compra", textoDeConfirmacionDeCancelacion(compra, formatearPrecio(compra.total)), [
      { text: "Volver", style: "cancel" },
      { text: "Cancelar compra", style: "destructive", onPress: cancelar },
    ]);

  if (error && !compra) return <Estado tipo="error" mensaje={error} onReintentar={cargar} />;
  if (!compra) return <Estado tipo="cargando" />;

  const dias = textoDiasRestantes(compra.diasRestantes);
  const motivo = motivoSinCancelacion(compra);
  const { organizador } = compra.evento;

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
    >
      {error ? <Text style={estilos.error}>{error}</Text> : null}
      {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}

      <EstadoCompra estado={compra.estado} />
      <Text style={tipografia.titulo}>{compra.evento.nombre}</Text>
      <Text style={tipografia.cuerpo}>{formatearFecha(compra.evento.fecha)}</Text>
      {dias ? <Text style={estilos.dias}>{dias}</Text> : null}

      <View style={estilos.tarjeta}>
        <Text style={tipografia.etiqueta}>Entradas</Text>
        <View style={estilos.fila}>
          <Text style={tipografia.cuerpo}>
            {textoEntradas(compra.cantidad)} · {compra.tipoEntrada.nombre}
          </Text>
          <Text style={estilos.total}>{formatearPrecio(compra.total)}</Text>
        </View>
        <Text style={tipografia.suave}>
          {formatearPrecio(compra.tipoEntrada.precio)} cada una · comprada el {formatearFechaCorta(compra.fecha)}
        </Text>
        <Text style={[tipografia.etiqueta, estilos.separado]}>Organizador</Text>
        <Text style={tipografia.cuerpo}>
          {organizador.nombre} {organizador.apellido}
        </Text>
      </View>

      <View style={estilos.separado}>
        <Boton
          titulo="Chat con el organizador"
          variante="secundario"
          onPress={() =>
            navigation.navigate("Chat", { compraId: compra.id, titulo: `Chat con ${organizador.nombre}` })
          }
        />
      </View>

      <Text style={estilos.seccion}>Seguimiento</Text>
      <SeguimientoCompra historial={compra.historial} />

      {puedeCancelar(compra) ? (
        <View style={estilos.acciones}>
          {errorDeCancelar ? <Text style={estilos.error}>{errorDeCancelar}</Text> : null}
          <Boton titulo="Cancelar compra" variante="peligro" onPress={pedirConfirmacion} cargando={cancelando} />
        </View>
      ) : motivo ? (
        <Text style={[tipografia.suave, estilos.separado]}>{motivo}</Text>
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.l, gap: espacio.s, paddingBottom: espacio.xxl },
  dias: { color: colores.exito, fontSize: 16, fontWeight: "700" },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.l,
    gap: espacio.xs,
    marginTop: espacio.m,
  },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  total: { fontSize: 18, fontWeight: "700", color: colores.texto },
  separado: { marginTop: espacio.m },
  seccion: { ...tipografia.subtitulo, marginTop: espacio.xl, marginBottom: espacio.s },
  acciones: { marginTop: espacio.xl, gap: espacio.m },
  error: { color: colores.error, fontSize: 14, fontWeight: "600" },
  aviso: { color: colores.exito, fontSize: 15, fontWeight: "700" },
});
