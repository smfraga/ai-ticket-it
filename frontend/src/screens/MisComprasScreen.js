import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Chip from "../components/Chip";
import CompraCard from "../components/CompraCard";
import EncabezadoDePestania from "../components/EncabezadoDePestania";
import Estado from "../components/Estado";
import MensajeDeError from "../components/MensajeDeError";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { listarMisCompras } from "../services/comprasService";
import { colores, espacio, tipografia } from "../theme";
import { filtrarPorGrupo, GRUPO_TODAS, gruposDeEstado, grupoVigente } from "../utils/compras";

export default function MisComprasScreen({ navigation }) {
  const [compras, setCompras] = useState(null); // null = todavía no llegó la primera respuesta
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [grupoElegido, setGrupoElegido] = useState(GRUPO_TODAS);
  const nuevoPedido = useUltimoPedido();

  // Se filtra en el celular: GET /compras ya trae todas las compras del usuario y son pocas.
  const grupos = useMemo(() => gruposDeEstado(compras ?? []), [compras]);
  const grupo = grupoVigente(grupos, grupoElegido);
  const visibles = useMemo(() => filtrarPorGrupo(compras ?? [], grupo), [compras, grupo]);

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
        data={visibles}
        keyExtractor={(compra) => compra.id}
        renderItem={({ item }) => (
          <CompraCard compra={item} onPress={() => navigation.navigate("DetalleCompra", { compraId: item.id })} />
        )}
        contentContainerStyle={estilos.lista}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
        ListHeaderComponent={error ? <MensajeDeError mensaje={error} style={estilos.errorAviso} /> : null}
        ListEmptyComponent={<Text style={[tipografia.cuerpo, estilos.vacio]}>Todavía no hiciste ninguna compra.</Text>}
      />
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <View style={estilos.cabecera}>
        <EncabezadoDePestania titulo="Mis compras" />
        {grupos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
            {grupos.map(({ id, etiqueta, cantidad }) => (
              <Chip
                key={id}
                etiqueta={`${etiqueta} (${cantidad})`}
                activo={id === grupo}
                onPress={() => setGrupoElegido(id)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>
      {contenido()}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { paddingHorizontal: espacio.l, paddingTop: espacio.m, gap: espacio.m },
  chips: { gap: espacio.s, paddingRight: espacio.l },
  lista: { padding: espacio.l, gap: espacio.m, flexGrow: 1 },
  vacio: { textAlign: "center", marginTop: espacio.xxl, color: colores.textoSuave },
  errorAviso: { ...tipografia.cuerpo, color: colores.error, marginBottom: espacio.m },
});
