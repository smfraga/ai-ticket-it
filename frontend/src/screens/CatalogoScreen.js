import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Chip from "../components/Chip";
import Estado from "../components/Estado";
import EventoCard from "../components/EventoCard";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { listarCategorias, listarEventos, ORDENES } from "../services/eventosService";
import { ALTO_TOQUE, colores, espacio, radio, tipografia } from "../theme";

const ESPERA_DE_BUSQUEDA_MS = 400;

export default function CatalogoScreen() {
  const [busqueda, setBusqueda] = useState("");
  const [texto, setTexto] = useState(""); // la búsqueda ya "asentada", para no pedir por cada letra
  const [categoriaId, setCategoriaId] = useState(null);
  const [orden, setOrden] = useState("fecha");
  const [categorias, setCategorias] = useState([]);
  const [eventos, setEventos] = useState(null); // null = todavía no llegó la primera respuesta
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const nuevoPedido = useUltimoPedido();

  useEffect(() => {
    const espera = setTimeout(() => setTexto(busqueda.trim()), ESPERA_DE_BUSQUEDA_MS);
    return () => clearTimeout(espera);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    const esVigente = nuevoPedido();
    setCargando(true);
    setError(null);
    try {
      const lista = await listarEventos({ texto, categoriaId, orden });
      if (esVigente()) setEventos(lista);
    } catch (e) {
      if (esVigente()) setError(mensajeDeError(e));
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [texto, categoriaId, orden, nuevoPedido]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Si las categorías no llegan, el catálogo sigue funcionando sin los chips.
  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch(() => {});
  }, []);

  const hayFiltros = texto !== "" || categoriaId !== null;

  const contenido = () => {
    if (error && eventos === null) return <Estado tipo="error" mensaje={error} onReintentar={cargar} />;
    if (eventos === null) return <Estado tipo="cargando" />;
    return (
      <FlatList
        data={eventos}
        keyExtractor={(evento) => evento.id}
        renderItem={({ item }) => <EventoCard evento={item} />}
        contentContainerStyle={estilos.lista}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
        ListHeaderComponent={error ? <Text style={estilos.errorAviso}>{error}</Text> : null}
        ListEmptyComponent={
          <Text style={[tipografia.cuerpo, estilos.vacio]}>
            {hayFiltros ? "No encontramos eventos con esos filtros." : "Todavía no hay eventos próximos."}
          </Text>
        }
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
          placeholderTextColor={colores.textoSuave}
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
    borderColor: colores.borde,
    borderRadius: radio.control,
    backgroundColor: colores.superficie,
    fontSize: 16,
    color: colores.texto,
  },
  chips: { gap: espacio.s, paddingRight: espacio.l },
  ordenes: { flexDirection: "row", alignItems: "center", gap: espacio.s },
  lista: { padding: espacio.l, gap: espacio.m, flexGrow: 1 },
  vacio: { textAlign: "center", marginTop: espacio.xxl, color: colores.textoSuave },
  errorAviso: { color: colores.error, marginBottom: espacio.m },
});
