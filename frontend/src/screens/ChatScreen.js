import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { useMensajes } from "../auth/MensajesContext";
import Estado from "../components/Estado";
import GloboMensaje from "../components/GloboMensaje";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { enviarMensaje, listarMensajes } from "../services/comprasService";
import { ALTO_TOQUE, colores, espacio, fuentes, radio, tipografia } from "../theme";
import { claveDeMensaje, esMensajePropio, LARGO_MAXIMO_DE_MENSAJE, textoEnviable } from "../utils/chat";
import { conSeparadores } from "../utils/fechasChat";

const INTERVALO_DE_ACTUALIZACION_MS = 5000;
const DISTANCIA_PARA_SEGUIR_AL_FINAL = 80;
const AVISO_DE_LARGO = LARGO_MAXIMO_DE_MENSAJE - 100;

// Chat de una compra. Sirve para el comprador y para el organizador: no supone el rol, compara el autor con el usuario.
export default function ChatScreen({ route, navigation }) {
  const { compraId, titulo } = route.params;
  const { usuario } = useAuth();
  const { recargar: recargarConversaciones } = useMensajes();
  const alturaDelEncabezado = useHeaderHeight();
  const [mensajes, setMensajes] = useState(null); // null = todavía no llegó la primera respuesta
  const [errorDeCarga, setErrorDeCarga] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorDeEnvio, setErrorDeEnvio] = useState(null);
  const lista = useRef(null);
  const estaAlFinal = useRef(true); // si quien lee subió a ver mensajes viejos, no se lo baja de golpe
  const nuevoPedido = useUltimoPedido();

  useEffect(() => {
    if (titulo) navigation.setOptions({ title: titulo });
  }, [navigation, titulo]);

  const cargar = useCallback(async () => {
    const esVigente = nuevoPedido();
    try {
      const datos = await listarMensajes(compraId);
      if (!esVigente()) return;
      setMensajes(datos);
      setErrorDeCarga(null);
    } catch (e) {
      if (esVigente()) setErrorDeCarga(mensajeDeError(e));
    }
  }, [compraId, nuevoPedido]);

  // Pide los mensajes al entrar y cada 5 s mientras la pantalla está a la vista; al salir, se corta.
  // Leer el chat lo marca como leído en el backend: después de la primera lectura y al salir se actualiza el
  // número de la pestaña Mensajes.
  useFocusEffect(
    useCallback(() => {
      cargar().then(recargarConversaciones);
      const intervalo = setInterval(cargar, INTERVALO_DE_ACTUALIZACION_MS);
      return () => {
        clearInterval(intervalo);
        recargarConversaciones();
      };
    }, [cargar, recargarConversaciones]),
  );

  const enviar = async () => {
    const mensaje = textoEnviable(texto);
    if (!mensaje || enviando) return;
    setErrorDeEnvio(null);
    setEnviando(true);
    try {
      const enviado = await enviarMensaje(compraId, mensaje);
      setTexto("");
      estaAlFinal.current = true;
      setMensajes((previos) => [...(previos ?? []), enviado]);
      cargar(); // y deja sin efecto cualquier actualización que haya salido antes del envío
    } catch (e) {
      setErrorDeEnvio(mensajeDeError(e)); // el texto queda en el campo para reintentar
    } finally {
      setEnviando(false);
    }
  };

  const alDesplazar = ({ nativeEvent }) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    estaAlFinal.current =
      contentSize.height - (contentOffset.y + layoutMeasurement.height) < DISTANCIA_PARA_SEGUIR_AL_FINAL;
  };

  const bajarSiCorresponde = () => {
    if (estaAlFinal.current) lista.current?.scrollToEnd({ animated: true });
  };

  if (mensajes === null && errorDeCarga) return <Estado tipo="error" mensaje={errorDeCarga} onReintentar={cargar} />;
  if (mensajes === null) return <Estado tipo="cargando" />;

  const sePuedeEnviar = textoEnviable(texto) !== null && !enviando;
  // Separadores "Hoy", "Ayer", día de la semana o fecha entre los mensajes de cada día, como en WhatsApp.
  const elementos = conSeparadores(mensajes, new Date());

  return (
    <SafeAreaView style={estilos.pantalla} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={estilos.pantalla}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={alturaDelEncabezado}
      >
        {errorDeCarga ? (
          <Text style={estilos.avisoDeConexion}>Sin conexión: {errorDeCarga}. Se reintenta solo.</Text>
        ) : null}
        <FlatList
          ref={lista}
          data={elementos}
          keyExtractor={(item) => (item.tipo === "dia" ? item.clave : claveDeMensaje(item.mensaje, item.indice))}
          renderItem={({ item }) =>
            item.tipo === "dia" ? (
              <Text style={estilos.separadorDeDia} accessibilityRole="header">
                {item.etiqueta}
              </Text>
            ) : (
              <GloboMensaje mensaje={item.mensaje} propio={esMensajePropio(item.mensaje, usuario.id)} />
            )
          }
          contentContainerStyle={estilos.lista}
          onScroll={alDesplazar}
          scrollEventThrottle={100}
          onContentSizeChange={bajarSiCorresponde}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={[tipografia.suave, estilos.vacio]}>Todavía no hay mensajes. Escribí el primero.</Text>
          }
        />
        <View style={estilos.redaccion}>
          {errorDeEnvio ? <Text style={estilos.error}>No se envió: {errorDeEnvio}</Text> : null}
          {texto.length >= AVISO_DE_LARGO ? (
            <Text style={tipografia.suave}>
              {texto.length} / {LARGO_MAXIMO_DE_MENSAJE}
            </Text>
          ) : null}
          <View style={estilos.filaDeRedaccion}>
            <TextInput
              accessibilityLabel="Mensaje"
              placeholder="Escribí un mensaje"
              placeholderTextColor={colores.textoPlaceholder}
              value={texto}
              onChangeText={setTexto}
              maxLength={LARGO_MAXIMO_DE_MENSAJE}
              multiline
              style={estilos.campo}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar mensaje"
              accessibilityState={{ disabled: !sePuedeEnviar }}
              disabled={!sePuedeEnviar}
              onPress={enviar}
              style={[estilos.enviar, !sePuedeEnviar && estilos.enviarInactivo]}
            >
              <Text style={estilos.textoEnviar}>{enviando ? "…" : "Enviar"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  lista: { padding: espacio.l, gap: espacio.s, flexGrow: 1 },
  vacio: { textAlign: "center", marginTop: espacio.xxl },
  // Pastilla opaca: se lee sobre cualquier fondo del chat.
  separadorDeDia: {
    alignSelf: "center",
    marginVertical: espacio.s,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.xs,
    borderRadius: radio.pastilla,
    overflow: "hidden",
    backgroundColor: colores.superficieAlta,
    color: colores.textoSuave,
    fontFamily: fuentes.seminegrita,
    fontSize: 12,
  },
  avisoDeConexion: {
    backgroundColor: colores.errorSuave,
    color: colores.error,
    fontFamily: fuentes.regular,
    fontSize: 13,
    paddingHorizontal: espacio.l,
    paddingVertical: espacio.s,
  },
  redaccion: {
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    backgroundColor: colores.superficie,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.s,
    gap: espacio.xs,
  },
  filaDeRedaccion: { flexDirection: "row", alignItems: "flex-end", gap: espacio.s },
  campo: {
    flex: 1,
    minHeight: ALTO_TOQUE,
    maxHeight: 120,
    paddingHorizontal: espacio.m,
    paddingTop: espacio.m,
    paddingBottom: espacio.m,
    borderWidth: 1,
    borderColor: colores.bordeControl,
    borderRadius: radio.control,
    backgroundColor: colores.fondo,
    fontFamily: fuentes.regular,
    fontSize: 16,
    color: colores.texto,
  },
  enviar: {
    minHeight: ALTO_TOQUE,
    paddingHorizontal: espacio.l,
    borderRadius: radio.control,
    backgroundColor: colores.primario,
    alignItems: "center",
    justifyContent: "center",
  },
  enviarInactivo: { opacity: 0.4 },
  textoEnviar: { color: colores.textoSobrePrimario, fontSize: 16, fontFamily: fuentes.seminegrita },
  error: { color: colores.error, fontSize: 13, fontFamily: fuentes.seminegrita },
});
