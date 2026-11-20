import { useCallback, useEffect, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useHeaderHeight } from "@react-navigation/elements";
import { API_URL } from "../config";
import { mensajeDeError } from "../services/api";
import { listarCategorias } from "../services/eventosService";
import { elegirImagenesDeEvento } from "../services/imagenesDeEvento";
import { colores, espacio, fuentes, radio, tipografia } from "../theme";
import { errorDeEvento, imagenesQueFaltan, MAXIMO_DE_IMAGENES, tipoEntradaVacio, urlDeImagen } from "../utils/eventos";
import Boton from "./Boton";
import CampoTexto from "./CampoTexto";
import Chip from "./Chip";
import SelectorFechaHora from "./SelectorFechaHora";

const LADO_MINIATURA = 96;

// Formulario del organizador para crear o editar un evento: datos del evento y uno o más tipos de entrada.
// `inicial` trae los valores de arranque (al editar, los del evento; un tipo con `vendidas > 0` tiene el precio
// bloqueado y no se puede quitar). `onEnviar(formulario)` hace el pedido; si falla, el error se muestra acá y los
// datos quedan para corregir.
export default function FormularioEvento({ inicial, textoBoton, onEnviar }) {
  const alturaDelEncabezado = useHeaderHeight();
  const [ahora] = useState(() => new Date());
  const [nombre, setNombre] = useState(inicial.nombre);
  const [descripcion, setDescripcion] = useState(inicial.descripcion);
  // `clave` identifica cada miniatura en pantalla (las elegidas todavía no tienen ruta en el servidor).
  const proximaClaveDeImagen = useRef(inicial.imagenes.length);
  const [imagenes, setImagenes] = useState(() => inicial.imagenes.map((imagen, i) => ({ ...imagen, clave: i })));
  const [adjuntando, setAdjuntando] = useState(false);
  const [categoriaId, setCategoriaId] = useState(inicial.categoriaId);
  const [fecha, setFecha] = useState(inicial.fecha);
  // `clave` identifica cada tarjeta en pantalla (los tipos nuevos todavía no tienen id).
  const proximaClave = useRef(inicial.tiposEntrada.length);
  const [tiposEntrada, setTiposEntrada] = useState(() =>
    inicial.tiposEntrada.map((tipo, i) => ({ ...tipo, clave: i })),
  );
  const [categorias, setCategorias] = useState(null);
  const [errorDeCategorias, setErrorDeCategorias] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargarCategorias = useCallback(async () => {
    setErrorDeCategorias(null);
    try {
      setCategorias(await listarCategorias());
    } catch (e) {
      setErrorDeCategorias(mensajeDeError(e));
    }
  }, []);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  const cambiarTipo = (clave, campo, valor) =>
    setTiposEntrada((tipos) => tipos.map((tipo) => (tipo.clave === clave ? { ...tipo, [campo]: valor } : tipo)));

  const agregarTipo = () =>
    setTiposEntrada((tipos) => [...tipos, { ...tipoEntradaVacio(), clave: proximaClave.current++ }]);

  const quitarTipo = (clave) => setTiposEntrada((tipos) => tipos.filter((tipo) => tipo.clave !== clave));

  // Las elegidas se suman al final, en el orden en que se tocaron; se suben recién al crear o guardar.
  const adjuntarImagenes = async () => {
    setAdjuntando(true);
    try {
      const elegidas = await elegirImagenesDeEvento(imagenesQueFaltan(imagenes));
      setImagenes((previas) =>
        [...previas, ...elegidas.map((imagen) => ({ ...imagen, clave: proximaClaveDeImagen.current++ }))].slice(
          0,
          MAXIMO_DE_IMAGENES,
        ),
      );
    } catch {
      setError("No se pudieron abrir las imágenes. Probá con otras.");
    } finally {
      setAdjuntando(false);
    }
  };

  const quitarImagen = (clave) => setImagenes((previas) => previas.filter((imagen) => imagen.clave !== clave));

  const enviar = async () => {
    const formulario = { nombre, descripcion, imagenes, categoriaId, fecha, tiposEntrada };
    const problema = errorDeEvento(formulario, new Date());
    setError(problema);
    if (problema) return;

    setEnviando(true);
    try {
      await onEnviar(formulario);
    } catch (e) {
      setError(mensajeDeError(e)); // los datos quedan en el formulario para corregir
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={estilos.pantalla}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={alturaDelEncabezado}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <CampoTexto etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej.: Recital de rock" />
        <CampoTexto
          etiqueta="Descripción (opcional)"
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Qué va a pasar, quiénes tocan, cómo llegar…"
          multiline
          style={estilos.multilinea}
        />
        <View style={estilos.bloque}>
          <Text style={tipografia.etiqueta}>
            Imágenes (opcional, {imagenes.length} de {MAXIMO_DE_IMAGENES})
          </Text>
          {imagenes.length > 0 ? (
            <View style={estilos.miniaturas}>
              {imagenes.map((imagen, i) => (
                <View key={imagen.clave} style={estilos.miniatura}>
                  <Image
                    source={{ uri: imagen.uri ?? urlDeImagen(imagen.url, API_URL) }}
                    style={estilos.miniaturaImagen}
                    resizeMode="cover"
                    accessibilityLabel={`Imagen ${i + 1}${i === 0 ? ", portada" : ""}`}
                    accessibilityIgnoresInvertColors
                  />
                  {/* La primera es la que se ve en las tarjetas del catálogo y de favoritos. */}
                  {i === 0 ? <Text style={estilos.portada}>Portada</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar la imagen ${i + 1}`}
                    onPress={() => quitarImagen(imagen.clave)}
                    hitSlop={8}
                    style={({ pressed }) => [estilos.quitarImagen, pressed && estilos.presionado]}
                  >
                    <Ionicons name="close" size={16} color={colores.textoSobreCapa} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <Boton
            titulo={
              imagenes.length >= MAXIMO_DE_IMAGENES
                ? `Ya tiene ${MAXIMO_DE_IMAGENES} imágenes`
                : imagenes.length > 0
                  ? "+ Adjuntar más imágenes"
                  : "+ Adjuntar imágenes"
            }
            variante="secundario"
            onPress={adjuntarImagenes}
            cargando={adjuntando}
            deshabilitado={imagenes.length >= MAXIMO_DE_IMAGENES}
          />
        </View>

        <View style={estilos.bloque}>
          <Text style={tipografia.etiqueta}>Categoría</Text>
          {errorDeCategorias ? (
            <View style={estilos.bloque}>
              <Text style={estilos.error}>{errorDeCategorias}</Text>
              <Boton titulo="Reintentar" variante="secundario" onPress={cargarCategorias} />
            </View>
          ) : categorias === null ? (
            <Text style={tipografia.suave}>Cargando categorías…</Text>
          ) : (
            <View style={estilos.chips}>
              {categorias.map((categoria) => (
                <Chip
                  key={categoria.id}
                  etiqueta={categoria.nombre}
                  activo={categoria.id === categoriaId}
                  onPress={() => setCategoriaId(categoria.id)}
                />
              ))}
            </View>
          )}
        </View>

        <SelectorFechaHora etiqueta="Fecha y hora" valor={fecha} minimo={ahora} onCambiar={setFecha} />

        <Text style={estilos.seccion}>Tipos de entrada</Text>
        {tiposEntrada.map((tipo, i) => {
          const conVentas = tipo.vendidas > 0;
          return (
            <View key={tipo.clave} style={estilos.tarjeta}>
              <View style={estilos.fila}>
                <Text style={tipografia.subtitulo}>Tipo {i + 1}</Text>
                {tiposEntrada.length > 1 && !conVentas ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar el tipo de entrada ${i + 1}`}
                    onPress={() => quitarTipo(tipo.clave)}
                    hitSlop={12}
                  >
                    <Text style={estilos.quitar}>Quitar</Text>
                  </Pressable>
                ) : null}
              </View>
              <CampoTexto
                etiqueta="Nombre"
                value={tipo.nombre}
                onChangeText={(valor) => cambiarTipo(tipo.clave, "nombre", valor)}
                placeholder="General, Platea, VIP…"
              />
              <View style={estilos.fila}>
                <View style={estilos.mitad}>
                  <CampoTexto
                    etiqueta="Precio ($)"
                    value={tipo.precio}
                    onChangeText={(valor) => cambiarTipo(tipo.clave, "precio", valor)}
                    keyboardType="decimal-pad"
                    placeholder="15000"
                    editable={!conVentas}
                    style={conVentas && estilos.bloqueado}
                  />
                </View>
                <View style={estilos.mitad}>
                  <CampoTexto
                    etiqueta="Cupo"
                    value={tipo.cupo}
                    onChangeText={(valor) => cambiarTipo(tipo.clave, "cupo", valor)}
                    keyboardType="number-pad"
                    placeholder="100"
                  />
                </View>
              </View>
              {conVentas ? (
                <Text style={tipografia.suave}>
                  {tipo.vendidas === 1 ? "1 entrada vendida" : `${tipo.vendidas} entradas vendidas`}: el precio queda
                  fijo, el tipo no se puede quitar y el cupo no puede ser menor.
                </Text>
              ) : null}
            </View>
          );
        })}
        <Boton titulo="+ Agregar tipo de entrada" variante="secundario" onPress={agregarTipo} />

        <View style={estilos.acciones}>
          {error ? <Text style={estilos.error}>{error}</Text> : null}
          <Boton titulo={textoBoton} onPress={enviar} cargando={enviando} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.l, gap: espacio.l, paddingBottom: espacio.xxl },
  multilinea: { minHeight: 96, paddingTop: espacio.m, textAlignVertical: "top" },
  bloque: { gap: espacio.s },
  miniaturas: { flexDirection: "row", flexWrap: "wrap", gap: espacio.s },
  miniatura: { width: LADO_MINIATURA, height: LADO_MINIATURA, borderRadius: radio.control, overflow: "hidden" },
  miniaturaImagen: { width: "100%", height: "100%", backgroundColor: colores.superficieAlta },
  portada: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 2,
    textAlign: "center",
    backgroundColor: colores.capaSobreFoto,
    color: colores.textoSobreCapa,
    fontSize: 11,
    fontFamily: fuentes.seminegrita,
  },
  // Círculo oscuro con la ✕, para que se vea sobre cualquier foto.
  quitarImagen: {
    position: "absolute",
    top: espacio.xs,
    right: espacio.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.capaSobreFoto,
  },
  presionado: { opacity: 0.6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: espacio.s },
  seccion: { ...tipografia.subtitulo, marginTop: espacio.s },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.l,
    gap: espacio.m,
  },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacio.m },
  mitad: { flex: 1 },
  quitar: { color: colores.error, fontSize: 15, fontFamily: fuentes.seminegrita },
  bloqueado: { backgroundColor: colores.fondo, color: colores.textoSuave },
  acciones: { marginTop: espacio.m, gap: espacio.m },
  error: { color: colores.error, fontSize: 14, fontFamily: fuentes.seminegrita },
});
