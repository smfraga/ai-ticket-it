import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { useFavoritos } from "../auth/FavoritosContext";
import EncabezadoDePestania from "../components/EncabezadoDePestania";
import Estado from "../components/Estado";
import EventoCard from "../components/EventoCard";
import HojaDeFiltros from "../components/HojaDeFiltros";
import MensajeDeError from "../components/MensajeDeError";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { EVENTOS_POR_PAGINA, listarCategorias, listarEventos, ORDENES, PERIODOS } from "../services/eventosService";
import { ALTO_TOQUE, colores, espacio, fuentes, radio, tipografia } from "../theme";
import {
  agregarPagina,
  FILTROS_POR_DEFECTO,
  filtrosActivos,
  hayMasPaginas,
  parametrosDePrecio,
  sinFiltro,
  textoDeCantidad,
  tituloDelBotonDeFiltros,
} from "../utils/eventos";

const ESPERA_DE_BUSQUEDA_MS = 400;

export default function CatalogoScreen({ navigation }) {
  const [busqueda, setBusqueda] = useState("");
  const [texto, setTexto] = useState(""); // la búsqueda ya "asentada", para no pedir por cada letra
  const [filtros, setFiltros] = useState(FILTROS_POR_DEFECTO); // categoría, período, precio y orden
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [eventos, setEventos] = useState(null); // null = todavía no llegó la primera respuesta
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  // Scroll infinito: la última página que llegó, si puede haber más, y la carga y el error de la siguiente.
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [total, setTotal] = useState(0); // cuántos cumplen los filtros, en todas las páginas
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorDeMas, setErrorDeMas] = useState(null);
  const nuevoPedido = useUltimoPedido();
  const { esComprador } = useAuth();
  const { esFavorito, alternar, recargar: recargarFavoritos } = useFavoritos();

  // Al volver a la pestaña, los corazones se actualizan (por si se quitó un favorito desde otra pantalla o dispositivo).
  useFocusEffect(
    useCallback(() => {
      recargarFavoritos();
    }, [recargarFavoritos]),
  );

  useEffect(() => {
    const espera = setTimeout(() => setTexto(busqueda.trim()), ESPERA_DE_BUSQUEDA_MS);
    return () => clearTimeout(espera);
  }, [busqueda]);

  // Lo que se le pide al backend con la búsqueda y los filtros actuales, para una página dada.
  const pedirPagina = useCallback(
    (numero) => {
      const { categoriaId, orden, periodo, rangoDePrecio } = filtros;
      return listarEventos({
        texto,
        categoriaId,
        orden,
        periodo,
        ...parametrosDePrecio(rangoDePrecio),
        pagina: numero,
        limite: EVENTOS_POR_PAGINA,
      });
    },
    [texto, filtros],
  );

  // Primera página: al entrar, al cambiar la búsqueda o un filtro y al tirar para refrescar. Deja sin efecto una
  // página siguiente que estuviera en camino (`useUltimoPedido`).
  const cargar = useCallback(async () => {
    const esVigente = nuevoPedido();
    setCargando(true);
    setCargandoMas(false);
    setError(null);
    setErrorDeMas(null);
    try {
      const respuesta = await pedirPagina(1);
      if (!esVigente()) return;
      setEventos(respuesta.eventos);
      setPagina(respuesta.pagina);
      setTotal(respuesta.total);
      setHayMas(hayMasPaginas(respuesta.pagina, respuesta.totalPaginas));
    } catch (e) {
      if (esVigente()) setError(mensajeDeError(e));
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [pedirPagina, nuevoPedido]);

  // La página siguiente, al acercarse al final de la lista. Una sola a la vez y nunca mientras se recarga. Si la
  // anterior falló, no se reintenta sola al desplazarse: hay que tocar "Reintentar" (`reintentar`).
  const cargarMas = async ({ reintentar = false } = {}) => {
    if (!hayMas || cargando || cargandoMas || (errorDeMas && !reintentar)) return;
    const esVigente = nuevoPedido();
    setErrorDeMas(null);
    setCargandoMas(true);
    try {
      const respuesta = await pedirPagina(pagina + 1);
      if (!esVigente()) return;
      setEventos((previos) => agregarPagina(previos ?? [], respuesta.eventos));
      setPagina(respuesta.pagina);
      setTotal(respuesta.total);
      setHayMas(hayMasPaginas(respuesta.pagina, respuesta.totalPaginas));
    } catch (e) {
      if (esVigente()) setErrorDeMas(mensajeDeError(e));
    } finally {
      if (esVigente()) setCargandoMas(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Si las categorías no llegan, el catálogo sigue funcionando sin ese filtro.
  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch(() => {});
  }, []);

  const cambiarFiltro = (clave, valor) => setFiltros((previos) => ({ ...previos, [clave]: valor }));
  const activos = filtrosActivos(filtros, { categorias, periodos: PERIODOS, ordenes: ORDENES });

  const hayFiltros = texto !== "" || filtros.categoriaId !== null || filtros.rangoDePrecio !== "cualquiera";
  const textoVacio = hayFiltros
    ? "No encontramos eventos con esos filtros."
    : filtros.periodo === "pasados"
      ? "Todavía no hay eventos pasados."
      : "Todavía no hay eventos próximos.";

  const contenido = () => {
    if (error && eventos === null) return <Estado tipo="error" mensaje={error} onReintentar={cargar} />;
    if (eventos === null) return <Estado tipo="cargando" />;
    return (
      <FlatList
        data={eventos}
        keyExtractor={(evento) => evento.id}
        renderItem={({ item }) => (
          <EventoCard
            evento={item}
            onPress={() => navigation.navigate("DetalleEvento", { eventoId: item.id })}
            favorito={esFavorito(item.id)}
            onAlternarFavorito={esComprador ? alternar : undefined}
          />
        )}
        contentContainerStyle={estilos.lista}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
        ListHeaderComponent={error ? <MensajeDeError mensaje={error} style={estilos.errorAviso} /> : null}
        ListEmptyComponent={<Text style={[tipografia.cuerpo, estilos.vacio]}>{textoVacio}</Text>}
        onEndReached={() => cargarMas()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          cargandoMas ? (
            <ActivityIndicator color={colores.primario} style={estilos.pie} accessibilityLabel="Cargando más eventos" />
          ) : errorDeMas ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`No se pudieron cargar más eventos: ${errorDeMas}. Tocá para reintentar`}
              onPress={() => cargarMas({ reintentar: true })}
              style={estilos.pie}
            >
              <MensajeDeError mensaje={`No se pudieron cargar más eventos: ${errorDeMas}`} style={estilos.errorAviso} />
              <Text style={estilos.reintentar}>Tocá para reintentar</Text>
            </Pressable>
          ) : eventos.length > 0 ? (
            <Text accessibilityRole="text" style={[tipografia.suave, estilos.pie, estilos.centrado]}>
              {textoDeCantidad(eventos.length, total)}
            </Text>
          ) : null
        }
      />
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <View style={estilos.cabecera}>
        <EncabezadoDePestania titulo="Eventos" />
        <View style={estilos.filaBusqueda}>
          <TextInput
            accessibilityLabel="Buscar eventos"
            placeholder="Buscar por nombre o descripción"
            placeholderTextColor={colores.textoPlaceholder}
            value={busqueda}
            onChangeText={setBusqueda}
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={estilos.buscador}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${tituloDelBotonDeFiltros(activos.length)}: categoría, período, precio y orden`}
            onPress={() => setHojaAbierta(true)}
            style={({ pressed }) => [
              estilos.botonFiltros,
              activos.length > 0 && estilos.botonFiltrosActivo,
              pressed && estilos.presionado,
            ]}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activos.length > 0 ? colores.textoSobrePrimario : colores.primario}
            />
            <Text style={[estilos.textoFiltros, activos.length > 0 && estilos.textoFiltrosActivo]}>
              {tituloDelBotonDeFiltros(activos.length)}
            </Text>
          </Pressable>
        </View>
        {activos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.activos}>
            {activos.map(({ clave, etiqueta }) => (
              <Pressable
                key={clave}
                accessibilityRole="button"
                accessibilityLabel={`Quitar el filtro ${etiqueta}`}
                onPress={() => setFiltros((previos) => sinFiltro(previos, clave))}
                style={({ pressed }) => [estilos.filtroActivo, pressed && estilos.presionado]}
              >
                <Text style={estilos.textoFiltroActivo}>{etiqueta}</Text>
                <Ionicons name="close" size={16} color={colores.primario} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>
      {contenido()}
      <HojaDeFiltros
        visible={hojaAbierta}
        filtros={filtros}
        categorias={categorias}
        onCambiar={cambiarFiltro}
        onLimpiar={() => setFiltros(FILTROS_POR_DEFECTO)}
        onCerrar={() => setHojaAbierta(false)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { paddingHorizontal: espacio.l, paddingTop: espacio.m, gap: espacio.m },
  filaBusqueda: { flexDirection: "row", alignItems: "center", gap: espacio.s },
  buscador: {
    flex: 1,
    minHeight: ALTO_TOQUE,
    paddingHorizontal: espacio.m,
    borderWidth: 1,
    borderColor: colores.bordeControl,
    borderRadius: radio.control,
    backgroundColor: colores.superficie,
    fontFamily: fuentes.regular,
    fontSize: 16,
    color: colores.texto,
  },
  botonFiltros: {
    minHeight: ALTO_TOQUE,
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.xs,
    paddingHorizontal: espacio.m,
    borderWidth: 1,
    borderColor: colores.primario,
    borderRadius: radio.control,
  },
  botonFiltrosActivo: { backgroundColor: colores.primario },
  textoFiltros: { fontFamily: fuentes.seminegrita, fontSize: 15, color: colores.primario },
  textoFiltrosActivo: { color: colores.textoSobrePrimario },
  activos: { gap: espacio.s, paddingRight: espacio.l },
  filtroActivo: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.xs,
    paddingLeft: espacio.m,
    paddingRight: espacio.s,
    borderRadius: radio.pastilla,
    borderWidth: 1,
    borderColor: colores.primario,
    backgroundColor: colores.superficie,
  },
  textoFiltroActivo: { fontFamily: fuentes.media, fontSize: 14, color: colores.texto },
  presionado: { opacity: 0.7 },
  lista: { padding: espacio.l, gap: espacio.m, flexGrow: 1 },
  vacio: { textAlign: "center", marginTop: espacio.xxl, color: colores.textoSuave },
  errorAviso: { ...tipografia.cuerpo, color: colores.error, marginBottom: espacio.m },
  pie: { paddingVertical: espacio.l },
  centrado: { textAlign: "center" },
  reintentar: { ...tipografia.cuerpo, color: colores.primario, textAlign: "center" },
});
