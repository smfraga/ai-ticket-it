import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFavoritos } from "../auth/FavoritosContext";
import EncabezadoDePestania from "../components/EncabezadoDePestania";
import Estado from "../components/Estado";
import EventoCard from "../components/EventoCard";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { listarFavoritos } from "../services/eventosService";
import { colores, espacio, tipografia } from "../theme";

// Los eventos guardados por el comprador, el último guardado primero (incluye los ya realizados).
export default function FavoritosScreen({ navigation }) {
  const { esFavorito, alternar, sincronizar } = useFavoritos();
  const [eventos, setEventos] = useState(null); // null = todavía no llegó la primera respuesta
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const nuevoPedido = useUltimoPedido();

  const cargar = useCallback(async () => {
    const esVigente = nuevoPedido();
    setCargando(true);
    setError(null);
    try {
      const lista = await listarFavoritos();
      if (!esVigente()) return;
      setEventos(lista);
      sincronizar(lista); // los corazones del catálogo y del detalle quedan iguales a esta lista
    } catch (e) {
      if (esVigente()) setError(mensajeDeError(e));
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [nuevoPedido, sincronizar]);

  // Se pide cada vez que se entra a la pestaña: así aparece lo que se guardó desde el catálogo.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const contenido = () => {
    if (error && eventos === null) return <Estado tipo="error" mensaje={error} onReintentar={cargar} />;
    if (eventos === null) return <Estado tipo="cargando" />;
    // Al tocar el corazón, el evento sale de la lista en el momento, sin volver a pedirla.
    const visibles = eventos.filter((evento) => esFavorito(evento.id));
    return (
      <FlatList
        data={visibles}
        keyExtractor={(evento) => evento.id}
        renderItem={({ item }) => (
          <EventoCard
            evento={item}
            onPress={() => navigation.navigate("DetalleEvento", { eventoId: item.id })}
            favorito
            onAlternarFavorito={alternar}
          />
        )}
        contentContainerStyle={estilos.lista}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
        ListHeaderComponent={error ? <Text style={estilos.errorAviso}>{error}</Text> : null}
        ListEmptyComponent={
          <Text style={[tipografia.cuerpo, estilos.vacio]}>
            Todavía no guardaste eventos. Tocá ♡ en un evento del catálogo para tenerlo a mano acá.
          </Text>
        }
      />
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <View style={estilos.cabecera}>
        <EncabezadoDePestania titulo="Favoritos" />
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
  errorAviso: { ...tipografia.cuerpo, color: colores.error, marginBottom: espacio.m },
});
