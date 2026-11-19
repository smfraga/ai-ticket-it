import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import CompraCard from "../components/CompraCard";
import Estado from "../components/Estado";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { listarComprasDelEvento } from "../services/comprasService";
import { colores, espacio, radio, tipografia } from "../theme";
import { resumenDeEstados } from "../utils/compras";
import { textoCupo } from "../utils/eventos";
import { formatearFecha } from "../utils/formato";

// Vista del organizador: entradas que quedan de cada tipo y las compras del evento con su estado.
export default function ComprasDelEventoScreen({ route, navigation }) {
  const { eventoId, nombreEvento } = route.params;
  const [datos, setDatos] = useState(null); // { evento, tiposEntrada, compras }
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
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

  if (error && !datos) return <Estado tipo="error" mensaje={error} onReintentar={cargar} />;
  if (!datos) return <Estado tipo="cargando" />;

  const resumen = resumenDeEstados(datos.compras);

  const cabecera = (
    <View style={estilos.cabecera}>
      {error ? <Text style={estilos.errorAviso}>{error}</Text> : null}
      <Text style={tipografia.cuerpo}>{formatearFecha(datos.evento.fecha)}</Text>

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
  cupo: { fontSize: 15, fontWeight: "600", color: colores.exito, flexShrink: 1, textAlign: "right" },
  agotado: { color: colores.error },
  seccion: { ...tipografia.subtitulo, marginTop: espacio.l },
  vacio: { textAlign: "center", marginTop: espacio.xl, color: colores.textoSuave },
  errorAviso: { color: colores.error },
});
