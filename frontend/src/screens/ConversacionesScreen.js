import { useCallback, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { useMensajes } from "../auth/MensajesContext";
import Avatar from "../components/Avatar";
import EncabezadoDePestania from "../components/EncabezadoDePestania";
import Estado from "../components/Estado";
import MensajeDeError from "../components/MensajeDeError";
import { API_URL } from "../config";
import { colores, espacio, fuentes, radio, tipografia } from "../theme";
import { insigniaDeNoLeidos, lineaDeLaConversacion, vistaPreviaDelMensaje } from "../utils/chat";
import { urlDeImagen } from "../utils/eventos";
import { horaEnLista } from "../utils/fechasChat";

const LADO_IMAGEN = 56;

// La pestaña Mensajes: un chat por compra (cada uno sobre un evento), el último mensaje más reciente primero.
// Los datos vienen de MensajesContext, que también da el número de la pestaña.
export default function ConversacionesScreen({ navigation }) {
  const { esComprador } = useAuth();
  const { conversaciones, error, recargar } = useMensajes();
  const [refrescando, setRefrescando] = useState(false);

  // Al entrar a la pestaña se vuelve a pedir, sin esperar la próxima vuelta de 15 s.
  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar]),
  );

  const refrescar = async () => {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  };

  const contenido = () => {
    if (error && conversaciones === null) return <Estado tipo="error" mensaje={error} onReintentar={recargar} />;
    if (conversaciones === null) return <Estado tipo="cargando" />;
    const ahora = new Date();
    return (
      <FlatList
        data={conversaciones}
        keyExtractor={(conversacion) => conversacion.compraId}
        renderItem={({ item }) => (
          <FilaDeConversacion
            conversacion={item}
            ahora={ahora}
            onPress={() =>
              navigation.navigate("Chat", {
                compraId: item.compraId,
                titulo: `Chat con ${item.contraparte.nombre}`,
                contraparte: item.contraparte,
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={estilos.separador} />}
        contentContainerStyle={estilos.lista}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colores.primario} />}
        ListHeaderComponent={
          error ? <MensajeDeError mensaje={`Sin conexión: ${error}`} style={estilos.errorAviso} /> : null
        }
        ListEmptyComponent={
          <Text style={[tipografia.cuerpo, estilos.vacio]}>
            {esComprador
              ? "Todavía no tenés conversaciones. Escribile al organizador desde el detalle de una compra."
              : "Todavía no tenés conversaciones. Cuando un comprador te escriba, el chat aparece acá."}
          </Text>
        }
      />
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <View style={estilos.cabecera}>
        <EncabezadoDePestania titulo="Mensajes" />
      </View>
      {contenido()}
    </SafeAreaView>
  );
}

function FilaDeConversacion({ conversacion, ahora, onPress }) {
  const { evento, noLeidos, ultimoMensaje } = conversacion;
  const [imagenFallo, setImagenFallo] = useState(false);
  const conNuevos = noLeidos > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre el chat"
      accessibilityLabel={`${evento.nombre}, ${lineaDeLaConversacion(conversacion)}. ${vistaPreviaDelMensaje(conversacion)}.${
        conNuevos ? ` ${noLeidos} ${noLeidos === 1 ? "mensaje nuevo" : "mensajes nuevos"}.` : ""
      }`}
      onPress={onPress}
      style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}
    >
      <View>
        {evento.imagen && !imagenFallo ? (
          <Image
            source={{ uri: urlDeImagen(evento.imagen, API_URL) }}
            style={estilos.imagen}
            accessibilityIgnoresInvertColors
            onError={() => setImagenFallo(true)}
          />
        ) : (
          <View style={[estilos.imagen, estilos.sinImagen]}>
            <Ionicons name="ticket" size={24} color={colores.primario} />
          </View>
        )}
        {/* La otra parte del chat, chiquita sobre la esquina del evento. */}
        <View style={estilos.avatar}>
          <Avatar persona={conversacion.contraparte} tamanio={26} />
        </View>
      </View>
      <View style={estilos.centro}>
        <Text style={estilos.evento} numberOfLines={1}>
          {evento.nombre}
        </Text>
        <Text style={estilos.linea} numberOfLines={1}>
          {lineaDeLaConversacion(conversacion)}
          {evento.cancelado ? " · Cancelado" : ""}
        </Text>
        <Text style={[estilos.vistaPrevia, conNuevos && estilos.vistaPreviaNueva]} numberOfLines={1}>
          {vistaPreviaDelMensaje(conversacion)}
        </Text>
      </View>
      <View style={estilos.derecha}>
        <Text style={[estilos.hora, conNuevos && estilos.horaNueva]}>{horaEnLista(ultimoMensaje.enviado, ahora)}</Text>
        {conNuevos ? (
          <View style={estilos.contador}>
            <Text style={estilos.textoContador}>{insigniaDeNoLeidos(noLeidos)}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { paddingHorizontal: espacio.l, paddingTop: espacio.m },
  lista: { paddingVertical: espacio.s, flexGrow: 1 },
  vacio: { textAlign: "center", marginTop: espacio.xxl, paddingHorizontal: espacio.xl, color: colores.textoSuave },
  errorAviso: { ...tipografia.suave, color: colores.error, paddingHorizontal: espacio.l, paddingBottom: espacio.s },
  separador: { height: 1, backgroundColor: colores.borde, marginLeft: espacio.l + LADO_IMAGEN + espacio.m },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.m,
    paddingHorizontal: espacio.l,
    paddingVertical: espacio.m,
  },
  presionada: { backgroundColor: colores.superficie },
  imagen: { width: LADO_IMAGEN, height: LADO_IMAGEN, borderRadius: radio.control },
  sinImagen: { backgroundColor: colores.superficieAlta, alignItems: "center", justifyContent: "center" },
  avatar: { position: "absolute", right: -6, bottom: -6, borderRadius: 15, borderWidth: 2, borderColor: colores.fondo },
  centro: { flex: 1, minWidth: 0, gap: 1 },
  evento: { fontFamily: fuentes.negrita, fontSize: 16, color: colores.texto },
  linea: { fontFamily: fuentes.regular, fontSize: 13, color: colores.textoSuave },
  vistaPrevia: { fontFamily: fuentes.regular, fontSize: 14, color: colores.textoSuave },
  vistaPreviaNueva: { fontFamily: fuentes.seminegrita, color: colores.texto },
  derecha: { alignItems: "flex-end", gap: espacio.xs, alignSelf: "flex-start", paddingTop: 2 },
  hora: { fontFamily: fuentes.regular, fontSize: 12, color: colores.textoSuave },
  horaNueva: { fontFamily: fuentes.seminegrita, color: colores.primario },
  contador: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colores.primario,
    alignItems: "center",
    justifyContent: "center",
  },
  textoContador: { fontFamily: fuentes.negrita, fontSize: 12, color: colores.textoSobrePrimario },
});
