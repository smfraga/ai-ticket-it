import { useCallback, useState } from "react";
import { RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import Boton from "../components/Boton";
import EncabezadoDePestania from "../components/EncabezadoDePestania";
import Estado from "../components/Estado";
import EventoCard from "../components/EventoCard";
import MensajeDeError from "../components/MensajeDeError";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { LIMITE_MAXIMO_DE_EVENTOS, listarEventos } from "../services/eventosService";
import { colores, espacio, tipografia } from "../theme";
import { separarPorPeriodo } from "../utils/eventos";

// Los eventos del organizador logueado, próximos y ya realizados. Tocar uno abre sus compras.
export default function MisEventosScreen({ navigation }) {
  const { usuario } = useAuth();
  const [eventos, setEventos] = useState(null); // null = todavía no llegó la primera respuesta
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const nuevoPedido = useUltimoPedido();

  const cargar = useCallback(async () => {
    const esVigente = nuevoPedido();
    setCargando(true);
    setError(null);
    try {
      // Todos los suyos de una vez (la respuesta es paginada; un organizador no llega a 100 eventos).
      const { eventos: lista } = await listarEventos({
        organizadorId: usuario.id,
        periodo: "todos",
        limite: LIMITE_MAXIMO_DE_EVENTOS,
      });
      if (esVigente()) setEventos(lista);
    } catch (e) {
      if (esVigente()) setError(mensajeDeError(e));
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [usuario.id, nuevoPedido]);

  // Se vuelve a pedir al entrar a la pestaña: así se actualizan los lugares vendidos (y aparece un evento nuevo).
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const contenido = () => {
    if (error && eventos === null) return <Estado tipo="error" mensaje={error} onReintentar={cargar} />;
    if (eventos === null) return <Estado tipo="cargando" />;

    const { proximos, pasados } = separarPorPeriodo(eventos);
    const secciones = [
      { titulo: "Próximos", data: proximos },
      { titulo: "Ya realizados", data: pasados },
    ].filter((seccion) => seccion.data.length > 0);

    return (
      <SectionList
        sections={secciones}
        keyExtractor={(evento) => evento.id}
        renderItem={({ item }) => (
          <EventoCard
            evento={item}
            onPress={() => navigation.navigate("ComprasDelEvento", { eventoId: item.id, nombreEvento: item.nombre })}
          />
        )}
        renderSectionHeader={({ section }) => <Text style={estilos.seccion}>{section.titulo}</Text>}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={estilos.lista}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
        ListHeaderComponent={error ? <MensajeDeError mensaje={error} style={estilos.errorAviso} /> : null}
        ListEmptyComponent={<Text style={[tipografia.cuerpo, estilos.vacio]}>Todavía no creaste ningún evento.</Text>}
      />
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <View style={estilos.cabecera}>
        <EncabezadoDePestania titulo="Mis eventos" />
        <Text style={tipografia.suave}>Tocá un evento para ver sus compras y las entradas que quedan.</Text>
        <View style={estilos.crear}>
          <Boton titulo="+ Crear evento" onPress={() => navigation.navigate("CrearEvento")} />
        </View>
      </View>
      {contenido()}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { paddingHorizontal: espacio.l, paddingTop: espacio.m, gap: espacio.xs },
  crear: { marginTop: espacio.s },
  lista: { padding: espacio.l, gap: espacio.m, flexGrow: 1 },
  seccion: { ...tipografia.subtitulo, marginTop: espacio.s },
  vacio: { textAlign: "center", marginTop: espacio.xxl, color: colores.textoSuave },
  errorAviso: { ...tipografia.cuerpo, color: colores.error, marginBottom: espacio.m },
});
