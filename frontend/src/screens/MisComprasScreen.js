import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import CompraCard from "../components/CompraCard";
import Estado from "../components/Estado";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { listarMisCompras } from "../services/comprasService";
import { colores, espacio, tipografia } from "../theme";

export default function MisComprasScreen() {
  const [compras, setCompras] = useState(null); // null = todavía no llegó la primera respuesta
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const nuevoPedido = useUltimoPedido();

  const cargar = useCallback(async () => {
    const esVigente = nuevoPedido();
    setCargando(true);
    setError(null);
    try {
      const lista = await listarMisCompras();
      if (esVigente()) setCompras(lista);
    } catch (e) {
      if (esVigente()) setError(mensajeDeError(e));
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [nuevoPedido]);

  // Cada vez que se entra a la pestaña se vuelve a pedir: así aparece la compra recién hecha.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const contenido = () => {
    if (error && compras === null) return <Estado tipo="error" mensaje={error} onReintentar={cargar} />;
    if (compras === null) return <Estado tipo="cargando" />;
    return (
      <FlatList
        data={compras}
        keyExtractor={(compra) => compra.id}
        renderItem={({ item }) => <CompraCard compra={item} />}
        contentContainerStyle={estilos.lista}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
        ListHeaderComponent={error ? <Text style={estilos.errorAviso}>{error}</Text> : null}
        ListEmptyComponent={<Text style={[tipografia.cuerpo, estilos.vacio]}>Todavía no hiciste ninguna compra.</Text>}
      />
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <View style={estilos.cabecera}>
        <Text style={tipografia.titulo}>Mis compras</Text>
      </View>
      {contenido()}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { paddingHorizontal: espacio.l, paddingTop: espacio.m },
  lista: { padding: espacio.l, gap: espacio.m, flexGrow: 1 },
  vacio: { textAlign: "center", marginTop: espacio.xxl, color: colores.textoSuave },
  errorAviso: { color: colores.error, marginBottom: espacio.m },
});
