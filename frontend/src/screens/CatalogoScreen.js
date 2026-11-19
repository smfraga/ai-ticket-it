import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { useFavoritos } from "../auth/FavoritosContext";
import Chip from "../components/Chip";
import Estado from "../components/Estado";
import EventoCard from "../components/EventoCard";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { listarCategorias, listarEventos, ORDENES, PERIODOS } from "../services/eventosService";
import { ALTO_TOQUE, colores, espacio, fuentes, radio, tipografia } from "../theme";
import { parametrosDePrecio, RANGOS_DE_PRECIO } from "../utils/eventos";

const ESPERA_DE_BUSQUEDA_MS = 400;

export default function CatalogoScreen({ navigation }) {
  const [busqueda, setBusqueda] = useState("");
  const [texto, setTexto] = useState(""); // la búsqueda ya "asentada", para no pedir por cada letra
  const [categoriaId, setCategoriaId] = useState(null);
  const [orden, setOrden] = useState("fecha");
  const [periodo, setPeriodo] = useState("proximos");
  const [rangoDePrecio, setRangoDePrecio] = useState("cualquiera");
  const [categorias, setCategorias] = useState([]);
  const [eventos, setEventos] = useState(null); // null = todavía no llegó la primera respuesta
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
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

  const cargar = useCallback(async () => {
    const esVigente = nuevoPedido();
    setCargando(true);
    setError(null);
    try {
      const lista = await listarEventos({ texto, categoriaId, orden, periodo, ...parametrosDePrecio(rangoDePrecio) });
      if (esVigente()) setEventos(lista);
    } catch (e) {
      if (esVigente()) setError(mensajeDeError(e));
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [texto, categoriaId, orden, periodo, rangoDePrecio, nuevoPedido]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Si las categorías no llegan, el catálogo sigue funcionando sin los chips.
  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch(() => {});
  }, []);

  const hayFiltros = texto !== "" || categoriaId !== null || rangoDePrecio !== "cualquiera";
  const textoVacio = hayFiltros
    ? "No encontramos eventos con esos filtros."
    : periodo === "pasados"
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
        ListHeaderComponent={error ? <Text style={estilos.errorAviso}>{error}</Text> : null}
        ListEmptyComponent={<Text style={[tipografia.cuerpo, estilos.vacio]}>{textoVacio}</Text>}
      />
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <View style={estilos.cabecera}>
        <Text style={tipografia.titulo}>Eventos</Text>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
          <Chip etiqueta="Todas" activo={categoriaId === null} onPress={() => setCategoriaId(null)} />
          {categorias.map((categoria) => (
            <Chip
              key={categoria.id}
              etiqueta={categoria.nombre}
              activo={categoriaId === categoria.id}
              onPress={() => setCategoriaId(categoria.id)}
            />
          ))}
        </ScrollView>
        <View style={estilos.ordenes}>
          <Text style={tipografia.etiqueta}>Mostrar</Text>
          {PERIODOS.map(({ valor, etiqueta }) => (
            <Chip key={valor} etiqueta={etiqueta} activo={periodo === valor} onPress={() => setPeriodo(valor)} />
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.ordenes}>
          <Text style={tipografia.etiqueta}>Precio</Text>
          {RANGOS_DE_PRECIO.map(({ valor, etiqueta }) => (
            <Chip
              key={valor}
              etiqueta={etiqueta}
              activo={rangoDePrecio === valor}
              onPress={() => setRangoDePrecio(valor)}
            />
          ))}
        </ScrollView>
        <View style={estilos.ordenes}>
          <Text style={tipografia.etiqueta}>Ordenar por</Text>
          {ORDENES.map(({ valor, etiqueta }) => (
            <Chip key={valor} etiqueta={etiqueta} activo={orden === valor} onPress={() => setOrden(valor)} />
          ))}
        </View>
      </View>
      {contenido()}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { paddingHorizontal: espacio.l, paddingTop: espacio.m, gap: espacio.m },
  buscador: {
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
  chips: { gap: espacio.s, paddingRight: espacio.l },
  ordenes: { flexDirection: "row", alignItems: "center", gap: espacio.s, paddingRight: espacio.l },
  lista: { padding: espacio.l, gap: espacio.m, flexGrow: 1 },
  vacio: { textAlign: "center", marginTop: espacio.xxl, color: colores.textoSuave },
  errorAviso: { ...tipografia.cuerpo, color: colores.error, marginBottom: espacio.m },
});
