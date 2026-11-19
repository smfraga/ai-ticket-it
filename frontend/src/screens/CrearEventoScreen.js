import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import Boton from "../components/Boton";
import CampoTexto from "../components/CampoTexto";
import Chip from "../components/Chip";
import SelectorFechaHora from "../components/SelectorFechaHora";
import { mensajeDeError } from "../services/api";
import { crearEvento, listarCategorias } from "../services/eventosService";
import { colores, espacio, radio, tipografia } from "../theme";
import { armarEventoParaEnviar, errorDeEvento, fechaInicialDeEvento, tipoEntradaVacio } from "../utils/eventos";

// Formulario del organizador: datos del evento y uno o más tipos de entrada, cada uno con precio y cupo.
export default function CrearEventoScreen({ navigation }) {
  const alturaDelEncabezado = useHeaderHeight();
  const [ahora] = useState(() => new Date());
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState(null);
  const [fecha, setFecha] = useState(() => fechaInicialDeEvento(ahora));
  const proximaClave = useRef(1);
  const [tiposEntrada, setTiposEntrada] = useState(() => [{ ...tipoEntradaVacio(), clave: 0 }]);
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

  const enviar = async () => {
    const formulario = { nombre, descripcion, categoriaId, fecha, tiposEntrada };
    const problema = errorDeEvento(formulario, new Date());
    setError(problema);
    if (problema) return;

    setEnviando(true);
    try {
      const creado = await crearEvento(armarEventoParaEnviar(formulario));
      // Reemplaza el formulario por las compras del evento nuevo: "volver" lleva a Mis eventos, no a un formulario ya enviado.
      navigation.replace("ComprasDelEvento", { eventoId: creado.id, nombreEvento: creado.nombre, recienCreado: true });
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
        {tiposEntrada.map((tipo, i) => (
          <View key={tipo.clave} style={estilos.tarjeta}>
            <View style={estilos.fila}>
              <Text style={tipografia.subtitulo}>Tipo {i + 1}</Text>
              {tiposEntrada.length > 1 ? (
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
          </View>
        ))}
        <Boton titulo="+ Agregar tipo de entrada" variante="secundario" onPress={agregarTipo} />

        <View style={estilos.acciones}>
          {error ? <Text style={estilos.error}>{error}</Text> : null}
          <Boton titulo="Crear evento" onPress={enviar} cargando={enviando} />
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
  quitar: { color: colores.error, fontSize: 15, fontWeight: "600" },
  acciones: { marginTop: espacio.m, gap: espacio.m },
  error: { color: colores.error, fontSize: 14, fontWeight: "600" },
});
