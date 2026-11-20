import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Boton from "../components/Boton";
import CompraCard from "../components/CompraCard";
import Estado from "../components/Estado";
import MensajeDeError from "../components/MensajeDeError";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { listarComprasDelEvento } from "../services/comprasService";
import { cancelarEvento } from "../services/eventosService";
import { colores, espacio, fuentes, radio, tipografia } from "../theme";
import { resumenDeEstados, textoDeConfirmacionDeCancelacionDeEvento } from "../utils/compras";
import { puedeGestionarEvento, textoCupo } from "../utils/eventos";
import { formatearFecha } from "../utils/formato";

// Vista del organizador: entradas que quedan de cada tipo y las compras del evento con su estado.
export default function ComprasDelEventoScreen({ route, navigation }) {
  // `aviso`: lo manda la pantalla de la que se viene ("¡Evento creado!…", "¡Cambios guardados!").
  const { eventoId, nombreEvento, aviso } = route.params;
  const [datos, setDatos] = useState(null); // { evento, tiposEntrada, compras }
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [errorDeCancelar, setErrorDeCancelar] = useState(null);
  const nuevoPedido = useUltimoPedido();

  useEffect(() => {
    if (nombreEvento) navigation.setOptions({ title: nombreEvento });
  }, [navigation, nombreEvento]);

  const cargar = useCallback(async () => {
    const esVigente = nuevoPedido();
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarComprasDelEvento(eventoId);
      if (esVigente()) setDatos(respuesta);
    } catch (e) {
      if (esVigente()) setError(mensajeDeError(e));
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [eventoId, nuevoPedido]);

  // Se vuelve a pedir al volver del detalle: si se marcó una compra como utilizada, el estado ya cambió.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const cancelar = async () => {
    setCancelando(true);
    setErrorDeCancelar(null);
    try {
      await cancelarEvento(eventoId);
    } catch (e) {
      setErrorDeCancelar(mensajeDeError(e));
    } finally {
      setCancelando(false);
      cargar(); // con éxito o con 409, se muestra el estado real
    }
  };

  const pedirConfirmacion = () =>
    Alert.alert("¿Cancelar el evento?", textoDeConfirmacionDeCancelacionDeEvento(datos.compras), [
      { text: "Volver", style: "cancel" },
      { text: "Cancelar evento", style: "destructive", onPress: cancelar },
    ]);

  if (error && !datos) return <Estado tipo="error" mensaje={error} onReintentar={cargar} />;
  if (!datos) return <Estado tipo="cargando" />;

  const resumen = resumenDeEstados(datos.compras);
  const gestionable = puedeGestionarEvento(datos.evento);

  const cabecera = (
    <View style={estilos.cabecera}>
      <MensajeDeError mensaje={error} style={estilos.errorAviso} />
      {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}
      <Text style={tipografia.cuerpo}>{formatearFecha(datos.evento.fecha)}</Text>
      {datos.evento.cancelado ? (
        <Text style={estilos.cancelado}>
          Cancelaste este evento: ya no está en el catálogo y sus compras se reembolsaron o cancelaron.
        </Text>
      ) : null}
      {gestionable ? (
        <Boton
          titulo="Editar evento"
          variante="secundario"
          onPress={() => navigation.navigate("EditarEvento", { eventoId })}
        />
      ) : null}

      <View style={estilos.tarjeta}>
        <Text style={tipografia.etiqueta}>Entradas disponibles</Text>
        {datos.tiposEntrada.map((tipo) => (
          <View key={tipo.id} style={estilos.fila}>
            <Text style={tipografia.cuerpo}>{tipo.nombre}</Text>
            <Text style={[estilos.cupo, tipo.cupoRestante <= 0 && estilos.agotado]}>{textoCupo(tipo)}</Text>
          </View>
        ))}
      </View>

      <Text style={estilos.seccion}>Compras ({datos.compras.length})</Text>
      {resumen ? <Text style={tipografia.suave}>{resumen}</Text> : null}
    </View>
  );

  return (
    <FlatList
      style={estilos.pantalla}
      data={datos.compras}
      keyExtractor={(compra) => compra.id}
      renderItem={({ item }) => (
        <CompraCard
          compra={item}
          mostrarComprador
          onPress={() => navigation.navigate("DetalleCompra", { compraId: item.id })}
        />
      )}
      ListHeaderComponent={cabecera}
      ListFooterComponent={
        gestionable ? (
          <View style={estilos.pie}>
            <MensajeDeError mensaje={errorDeCancelar} style={estilos.errorAviso} />
            <Boton titulo="Cancelar evento" variante="peligro" onPress={pedirConfirmacion} cargando={cancelando} />
          </View>
        ) : null
      }
      ListEmptyComponent={<Text style={[tipografia.cuerpo, estilos.vacio]}>Este evento todavía no tiene compras.</Text>}
      contentContainerStyle={estilos.lista}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
    />
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  lista: { padding: espacio.l, gap: espacio.m, paddingBottom: espacio.xxl, flexGrow: 1 },
  cabecera: { gap: espacio.s },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.l,
    gap: espacio.s,
    marginTop: espacio.s,
  },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacio.m },
  cupo: { fontSize: 15, fontFamily: fuentes.seminegrita, color: colores.exito, flexShrink: 1, textAlign: "right" },
  agotado: { color: colores.error },
  seccion: { ...tipografia.subtitulo, marginTop: espacio.l },
  vacio: { textAlign: "center", marginTop: espacio.xl, color: colores.textoSuave },
  errorAviso: { ...tipografia.cuerpo, color: colores.error },
  aviso: { color: colores.exito, fontSize: 15, fontFamily: fuentes.negrita },
  cancelado: { color: colores.error, fontSize: 15, fontFamily: fuentes.negrita },
  pie: { marginTop: espacio.xl, gap: espacio.s },
});
