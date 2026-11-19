import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import Boton from "../components/Boton";
import SelectorEstrellas from "../components/SelectorEstrellas";
import { mensajeDeError } from "../services/api";
import { reseniarCompra } from "../services/comprasService";
import { colores, espacio, radio, tipografia } from "../theme";
import { errorDeResenia } from "../utils/compras";

export default function ReseniaScreen({ route, navigation }) {
  const { compraId, nombreEvento } = route.params;
  const alturaDelEncabezado = useHeaderHeight();
  const [puntuacion, setPuntuacion] = useState(null);
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const publicar = async () => {
    const faltante = errorDeResenia({ puntuacion, detalle });
    if (faltante) {
      setError(faltante);
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await reseniarCompra(compraId, { puntuacion, detalle: detalle.trim() });
      navigation.goBack(); // el detalle se vuelve a pedir al recibir el foco y ya muestra la reseña
    } catch (e) {
      setError(mensajeDeError(e));
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
        <Text style={tipografia.titulo}>¿Cómo estuvo {nombreEvento}?</Text>
        <Text style={tipografia.suave}>
          Tu reseña la van a ver otros compradores en los eventos de este organizador.
        </Text>

        <Text style={[tipografia.etiqueta, estilos.separado]}>Puntuación</Text>
        <SelectorEstrellas valor={puntuacion} onCambiar={setPuntuacion} />

        <Text style={[tipografia.etiqueta, estilos.separado]}>Comentario</Text>
        <TextInput
          accessibilityLabel="Comentario"
          placeholder="Contá cómo fue tu experiencia"
          placeholderTextColor={colores.textoSuave}
          value={detalle}
          onChangeText={setDetalle}
          multiline
          textAlignVertical="top"
          style={estilos.campo}
        />

        {error ? <Text style={estilos.error}>{error}</Text> : null}
        <Boton titulo="Publicar reseña" onPress={publicar} cargando={enviando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.l, gap: espacio.s, paddingBottom: espacio.xxl },
  separado: { marginTop: espacio.l },
  campo: {
    minHeight: 120,
    padding: espacio.m,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.control,
    backgroundColor: colores.superficie,
    fontSize: 16,
    color: colores.texto,
    marginBottom: espacio.m,
  },
  error: { color: colores.error, fontSize: 14, fontWeight: "600", marginBottom: espacio.s },
});
