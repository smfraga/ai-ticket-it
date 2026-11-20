import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Boton from "../components/Boton";
import Entrada from "../components/Entrada";
import Estado from "../components/Estado";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { elegirFotoDePerfil } from "../services/fotoDePerfil";
import { cambiarFoto, obtenerPerfil, quitarFoto } from "../services/perfilService";
import { colores, espacio, fuentes, radio, tipografia } from "../theme";
import { textoEntradas } from "../utils/compras";
import { formatearPrecio } from "../utils/formato";
import { textoCantidadDeResenias, textoEventosCreados, textoPuntaje } from "../utils/perfil";

const ETIQUETAS_DE_ROL = { COMPRADOR: "Comprador", ORGANIZADOR: "Organizador" };

// `aviso`: lo manda la pantalla de la que se viene ("¡Datos guardados!").
export default function PerfilScreen({ navigation, route }) {
  const { usuario, logout, actualizarUsuario } = useAuth();
  const aviso = route.params?.aviso;
  const [perfil, setPerfil] = useState(null); // null = todavía no llegó
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const nuevoPedido = useUltimoPedido();

  const cargar = useCallback(async () => {
    const esVigente = nuevoPedido();
    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerPerfil();
      if (!esVigente()) return;
      setPerfil(datos);
      // El usuario guardado en el celular puede haber quedado viejo (por ejemplo, si el backend se reinició y la
      // foto ya no está): se reemplaza por el del backend.
      if (JSON.stringify(datos.usuario) !== JSON.stringify(usuario)) actualizarUsuario(datos.usuario);
    } catch (e) {
      if (esVigente()) setError(mensajeDeError(e));
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [nuevoPedido, usuario, actualizarUsuario]);

  // Elegir, cambiar o quitar la foto de perfil. La galería y el achicado (256×256) están en fotoDePerfil.js.
  const cambiarLaFoto = async () => {
    setSubiendoFoto(true);
    try {
      const imagen = await elegirFotoDePerfil();
      if (imagen) await actualizarUsuario(await cambiarFoto(imagen));
    } catch (e) {
      Alert.alert("No se pudo cambiar la foto", mensajeDeError(e));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const quitarLaFoto = async () => {
    setSubiendoFoto(true);
    try {
      await actualizarUsuario(await quitarFoto());
    } catch (e) {
      Alert.alert("No se pudo quitar la foto", mensajeDeError(e));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const opcionesDeFoto = () =>
    Alert.alert("Foto de perfil", "La ven los demás en el chat y en la lista de mensajes.", [
      { text: usuario.foto ? "Elegir otra foto" : "Elegir de la galería", onPress: cambiarLaFoto },
      ...(usuario.foto ? [{ text: "Quitar la foto", style: "destructive", onPress: quitarLaFoto }] : []),
      { text: "Cancelar", style: "cancel" },
    ]);

  // Se pide en cada foco: al volver de comprar, reseñar o editar, los números ya están al día.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  // A otra pestaña, dejando su pantalla principal abajo para poder volver con "atrás".
  const irA = (pestania, pantalla, params) =>
    navigation.navigate(pestania, { screen: pantalla, params, initial: false });

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <ScrollView
        contentContainerStyle={estilos.contenido}
        refreshControl={
          <RefreshControl refreshing={cargando && perfil !== null} onRefresh={cargar} tintColor={colores.primario} />
        }
      >
        <View style={estilos.cabecera}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={usuario.foto ? "Cambiar la foto de perfil" : "Agregar una foto de perfil"}
            onPress={opcionesDeFoto}
            disabled={subiendoFoto}
          >
            <Avatar persona={usuario} tamanio={72} />
            <View style={estilos.camara}>
              {subiendoFoto ? (
                <ActivityIndicator size="small" color={colores.textoSobrePrimario} />
              ) : (
                <Ionicons name="camera" size={14} color={colores.textoSobrePrimario} />
              )}
            </View>
          </Pressable>
          <View style={estilos.datos}>
            <Text style={tipografia.titulo}>
              {usuario.nombre} {usuario.apellido}
            </Text>
            <Text style={tipografia.suave}>{usuario.email}</Text>
            <Text style={tipografia.suave}>{usuario.roles.map((rol) => ETIQUETAS_DE_ROL[rol] ?? rol).join(" y ")}</Text>
          </View>
        </View>
        {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}
        <View style={estilos.botones}>
          <View style={estilos.boton}>
            <Boton titulo="Editar perfil" variante="secundario" onPress={() => navigation.navigate("EditarPerfil")} />
          </View>
          <View style={estilos.boton}>
            <Boton titulo="Fondo del chat" variante="secundario" onPress={() => navigation.navigate("FondoChat")} />
          </View>
        </View>

        {perfil === null && error ? <Estado tipo="error" mensaje={error} onReintentar={cargar} /> : null}
        {perfil === null && !error ? <Estado tipo="cargando" /> : null}
        {perfil !== null && error ? <Text style={estilos.errorAviso}>{error}</Text> : null}

        {perfil?.comprador ? <SeccionComprador datos={perfil.comprador} irA={irA} /> : null}
        {perfil?.organizador ? <SeccionOrganizador datos={perfil.organizador} irA={irA} /> : null}

        <View style={estilos.cerrar}>
          <Boton titulo="Cerrar sesión" variante="peligro" onPress={logout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SeccionComprador({ datos, irA }) {
  const { estadisticas, historial } = datos;
  return (
    <View style={estilos.seccion}>
      <Text style={estilos.tituloSeccion}>Como comprador</Text>
      <View style={estilos.grilla}>
        <Dato valor={estadisticas.entradasCompradas} etiqueta="Entradas compradas" />
        <Dato valor={formatearPrecio(estadisticas.totalGastado)} etiqueta="Total gastado" />
        <Dato valor={estadisticas.eventosALosQueFue} etiqueta="Eventos a los que fuiste" />
        <Dato valor={estadisticas.reseniasDejadas} etiqueta="Reseñas dejadas" />
      </View>
      {estadisticas.categoriaPreferida ? (
        <Text style={tipografia.cuerpo}>
          Tu categoría preferida: <Text style={estilos.destacado}>{estadisticas.categoriaPreferida}</Text>
        </Text>
      ) : null}

      {estadisticas.proximoEvento ? (
        <>
          <Text style={tipografia.etiqueta}>Tu próximo evento</Text>
          <TarjetaDeEvento
            evento={estadisticas.proximoEvento}
            onPress={() => irA("Eventos", "DetalleEvento", { eventoId: estadisticas.proximoEvento.id })}
          />
        </>
      ) : null}

      <Text style={tipografia.etiqueta}>Eventos a los que fuiste</Text>
      {historial.length === 0 ? (
        <Text style={tipografia.suave}>Cuando uses una entrada, el evento aparece acá.</Text>
      ) : (
        historial.map(({ evento, compras }) => (
          <TarjetaDeEvento
            key={evento.id}
            evento={evento}
            apagada
            detalle={compras
              .map(
                (compra) =>
                  `${textoEntradas(compra.cantidad)} ${compra.tipoEntrada.nombre} · ${formatearPrecio(compra.total)}`,
              )
              .join("\n")}
            onPress={() => irA("MisCompras", "DetalleCompra", { compraId: compras[0].id })}
          />
        ))
      )}
    </View>
  );
}

function SeccionOrganizador({ datos, irA }) {
  const { estadisticas, historial } = datos;
  const { eventoMasVendido } = estadisticas;
  return (
    <View style={estilos.seccion}>
      <Text style={estilos.tituloSeccion}>Como organizador</Text>
      <View style={estilos.grilla}>
        <Dato
          valor={estadisticas.eventosCreados.total}
          etiqueta="Eventos creados"
          detalle={textoEventosCreados(estadisticas.eventosCreados)}
        />
        <Dato valor={estadisticas.entradasVendidas} etiqueta="Entradas vendidas" />
        <Dato valor={formatearPrecio(estadisticas.recaudacion)} etiqueta="Recaudación" />
        <Dato
          valor={textoPuntaje(estadisticas.puntaje)}
          etiqueta="Tu puntaje"
          detalle={textoCantidadDeResenias(estadisticas.cantidadResenias)}
        />
      </View>

      {eventoMasVendido ? (
        <>
          <Text style={tipografia.etiqueta}>Tu evento más vendido</Text>
          <TarjetaDeEvento
            evento={eventoMasVendido.evento}
            detalle={`${textoEntradas(eventoMasVendido.entradasVendidas)} vendidas`}
            onPress={() =>
              irA("MisEventosTab", "ComprasDelEvento", {
                eventoId: eventoMasVendido.evento.id,
                nombreEvento: eventoMasVendido.evento.nombre,
              })
            }
          />
        </>
      ) : null}

      <Text style={tipografia.etiqueta}>Eventos que hiciste</Text>
      {historial.length === 0 ? (
        <Text style={tipografia.suave}>Cuando se realice uno de tus eventos, aparece acá.</Text>
      ) : (
        historial.map(({ evento, entradasVendidas, recaudacion }) => (
          <TarjetaDeEvento
            key={evento.id}
            evento={evento}
            apagada
            detalle={`${textoEntradas(entradasVendidas)} vendidas · ${formatearPrecio(recaudacion)}`}
            onPress={() =>
              irA("MisEventosTab", "ComprasDelEvento", { eventoId: evento.id, nombreEvento: evento.nombre })
            }
          />
        ))
      )}
    </View>
  );
}

// Un número grande con su etiqueta (y opcionalmente una línea de detalle).
function Dato({ valor, etiqueta, detalle }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.valor}>{valor}</Text>
      <Text style={estilos.etiquetaDato}>{etiqueta}</Text>
      {detalle ? <Text style={estilos.detalleDato}>{detalle}</Text> : null}
    </View>
  );
}

// Un evento con forma de entrada: la fecha en el talón (gris si ya pasó), el nombre y una línea de detalle.
function TarjetaDeEvento({ evento, apagada = false, detalle, onPress }) {
  return (
    <Entrada fecha={evento.fecha} apagada={apagada} onPress={onPress}>
      <View style={estilos.cuerpoTarjeta}>
        <Text style={estilos.categoria}>{evento.categoria.toUpperCase()}</Text>
        <Text style={tipografia.tituloTarjeta}>{evento.nombre}</Text>
        {detalle ? <Text style={tipografia.suave}>{detalle}</Text> : null}
      </View>
    </Entrada>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.l, gap: espacio.m, paddingBottom: espacio.xxl },
  cabecera: { flexDirection: "row", alignItems: "center", gap: espacio.l },
  // Insignia con la cámara sobre la foto: indica que se puede tocar para cambiarla.
  camara: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colores.fondo,
    backgroundColor: colores.primario,
    alignItems: "center",
    justifyContent: "center",
  },
  datos: { flex: 1, minWidth: 0, gap: 2 },
  aviso: { color: colores.exito, fontSize: 15, fontFamily: fuentes.negrita },
  botones: { flexDirection: "row", gap: espacio.m },
  boton: { flex: 1 },
  errorAviso: { ...tipografia.cuerpo, color: colores.error },
  seccion: { gap: espacio.m, marginTop: espacio.l },
  tituloSeccion: { ...tipografia.titulo, fontSize: 28, lineHeight: 30, color: colores.primario },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: espacio.m },
  dato: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colores.superficie,
    borderRadius: radio.tarjeta,
    borderLeftWidth: 4,
    borderLeftColor: colores.primario,
    padding: espacio.m,
    gap: 2,
  },
  valor: { fontFamily: fuentes.cartel, fontSize: 34, lineHeight: 36, color: colores.texto },
  etiquetaDato: { fontFamily: fuentes.seminegrita, fontSize: 13, color: colores.textoSuave },
  detalleDato: { fontFamily: fuentes.regular, fontSize: 12, color: colores.textoSuave },
  destacado: { fontFamily: fuentes.negrita, color: colores.primario },
  cuerpoTarjeta: { padding: espacio.m, gap: 2 },
  categoria: { fontFamily: fuentes.seminegrita, fontSize: 12, letterSpacing: 1, color: colores.primarioOscuro },
  cerrar: { marginTop: espacio.xl },
});
