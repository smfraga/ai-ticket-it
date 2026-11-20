import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import Boton from "../components/Boton";
import Estado from "../components/Estado";
import EstadoCompra from "../components/EstadoCompra";
import SeguimientoCompra from "../components/SeguimientoCompra";
import MensajeDeError from "../components/MensajeDeError";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { cancelarCompra, obtenerCompra, pagarCompra, utilizarCompra } from "../services/comprasService";
import { colores, espacio, fuentes, radio, tipografia } from "../theme";
import {
  motivoSinCancelacion,
  motivoSinUtilizar,
  puedeCancelar,
  puedeMarcarUtilizada,
  puedePagar,
  puedeReseniar,
  textoDeConfirmacionDeCancelacion,
  textoDeConfirmacionDePago,
  textoDeConfirmacionDeUso,
  textoDiasRestantes,
  textoEntradas,
  textoPlazoDePago,
  tituloDelBotonDeChat,
} from "../utils/compras";
import { formatearEstrellas, formatearFecha, formatearFechaCorta, formatearPrecio } from "../utils/formato";

const AVISO_REEMBOLSADA = "Compra cancelada. Se reembolsó el total y las entradas volvieron al cupo.";
const AVISO_CANCELADA = "Compra cancelada. Las entradas volvieron al cupo.";
const AVISO_UTILIZADA = "Entrada marcada como utilizada. El comprador ya puede dejar su reseña.";
const AVISO_PAGADA = "¡Pago confirmado! Tu compra ya está confirmada.";

export default function DetalleCompraScreen({ route, navigation }) {
  const { compraId } = route.params;
  const { usuario } = useAuth();
  const [compra, setCompra] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [errorDeCancelar, setErrorDeCancelar] = useState(null);
  const [pagando, setPagando] = useState(false);
  const [errorDePagar, setErrorDePagar] = useState(null);
  const [marcando, setMarcando] = useState(false);
  const [errorDeMarcar, setErrorDeMarcar] = useState(null);
  const [aviso, setAviso] = useState(null);
  const nuevoPedido = useUltimoPedido();

  const cargar = useCallback(async () => {
    const esVigente = nuevoPedido();
    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerCompra(compraId);
      if (esVigente()) setCompra(datos);
    } catch (e) {
      if (esVigente()) setError(mensajeDeError(e));
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [compraId, nuevoPedido]);

  // Se vuelve a pedir cada vez que la pantalla recibe el foco: al volver del chat o de publicar una reseña.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const cancelar = async () => {
    setErrorDeCancelar(null);
    setCancelando(true);
    try {
      const cancelada = await cancelarCompra(compraId);
      setAviso(cancelada.estado === "REEMBOLSADA" ? AVISO_REEMBOLSADA : AVISO_CANCELADA);
    } catch (e) {
      setErrorDeCancelar(mensajeDeError(e));
    } finally {
      setCancelando(false);
      cargar(); // en cualquier caso, que la pantalla muestre el estado real (incluso tras un 409)
    }
  };

  const pedirConfirmacion = () =>
    Alert.alert("Cancelar compra", textoDeConfirmacionDeCancelacion(compra, formatearPrecio(compra.total)), [
      { text: "Volver", style: "cancel" },
      { text: "Cancelar compra", style: "destructive", onPress: cancelar },
    ]);

  const pagar = async () => {
    setErrorDePagar(null);
    setPagando(true);
    try {
      await pagarCompra(compraId);
      setAviso(AVISO_PAGADA);
    } catch (e) {
      setErrorDePagar(mensajeDeError(e));
    } finally {
      setPagando(false);
      cargar(); // como al cancelar: muestra el estado real y los días que faltan, también tras un 409
    }
  };

  const pedirConfirmacionDePago = () =>
    Alert.alert("Pagar compra", textoDeConfirmacionDePago(formatearPrecio(compra.total)), [
      { text: "Volver", style: "cancel" },
      { text: "Pagar", onPress: pagar },
    ]);

  const marcarUtilizada = async () => {
    setErrorDeMarcar(null);
    setMarcando(true);
    try {
      await utilizarCompra(compraId);
      setAviso(AVISO_UTILIZADA);
    } catch (e) {
      setErrorDeMarcar(mensajeDeError(e));
    } finally {
      setMarcando(false);
      cargar(); // como al cancelar: el seguimiento muestra el estado real, también tras un 409
    }
  };

  const pedirConfirmacionDeUso = () =>
    Alert.alert("Marcar como utilizada", textoDeConfirmacionDeUso(compra), [
      { text: "Volver", style: "cancel" },
      { text: "Marcar utilizada", onPress: marcarUtilizada },
    ]);

  if (error && !compra) return <Estado tipo="error" mensaje={error} onReintentar={cargar} />;
  if (!compra) return <Estado tipo="cargando" />;

  const dias = textoDiasRestantes(compra.diasRestantes);
  const motivo = motivoSinCancelacion(compra);
  const motivoDeUso = motivoSinUtilizar(compra);
  const { organizador } = compra.evento;
  const { comprador } = compra;
  // La misma pantalla sirve a las dos partes; se decide por id y no por rol, porque un usuario puede tener los dos.
  // Cancelar y reseñar son del comprador; marcar utilizada, del organizador del evento.
  const esElComprador = comprador.id === usuario.id;
  const esElOrganizador = organizador.id === usuario.id;
  // En la tarjeta y en el chat se muestra a la otra parte.
  const plazoDePago = textoPlazoDePago(compra, esElComprador);
  const contraparte = esElComprador
    ? { etiqueta: "Organizador", persona: organizador, chat: "Chat con el organizador" }
    : { etiqueta: "Comprador", persona: comprador, chat: "Chat con el comprador" };

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
    >
      <MensajeDeError mensaje={error} style={estilos.error} />
      {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}

      <EstadoCompra estado={compra.estado} />
      <Text style={tipografia.titulo}>{compra.evento.nombre}</Text>
      <Text style={tipografia.cuerpo}>{formatearFecha(compra.evento.fecha)}</Text>
      {compra.evento.cancelado ? (
        <Text style={estilos.cancelado}>
          {esElComprador
            ? "El organizador canceló el evento. El seguimiento muestra qué pasó con tu compra."
            : "Cancelaste este evento."}
        </Text>
      ) : null}
      {dias ? <Text style={estilos.dias}>{dias}</Text> : null}

      <View style={estilos.tarjeta}>
        <Text style={tipografia.etiqueta}>Entradas</Text>
        <View style={estilos.fila}>
          <Text style={tipografia.cuerpo}>
            {textoEntradas(compra.cantidad)} · {compra.tipoEntrada.nombre}
          </Text>
          <Text style={estilos.total}>{formatearPrecio(compra.total)}</Text>
        </View>
        <Text style={tipografia.suave}>
          {formatearPrecio(compra.tipoEntrada.precio)} cada una · comprada el {formatearFechaCorta(compra.fecha)}
        </Text>
        <Text style={[tipografia.etiqueta, estilos.separado]}>{contraparte.etiqueta}</Text>
        <Text style={tipografia.cuerpo}>
          {contraparte.persona.nombre} {contraparte.persona.apellido}
        </Text>
      </View>

      {esElComprador && puedePagar(compra) ? (
        <View style={estilos.acciones}>
          <Text style={tipografia.cuerpo}>
            Esta compra está pendiente de pago: las entradas quedan reservadas hasta que la pagues.
          </Text>
          {plazoDePago ? <Text style={estilos.plazo}>{plazoDePago}</Text> : null}
          <MensajeDeError mensaje={errorDePagar} style={estilos.error} />
          <Boton
            titulo={`Pagar ${formatearPrecio(compra.total)}`}
            onPress={pedirConfirmacionDePago}
            cargando={pagando}
          />
        </View>
      ) : null}

      <View style={estilos.separado}>
        <Boton
          titulo={tituloDelBotonDeChat(contraparte.chat, compra.mensajesNoLeidos)}
          variante="secundario"
          onPress={() =>
            navigation.navigate("Chat", { compraId: compra.id, titulo: `Chat con ${contraparte.persona.nombre}` })
          }
        />
      </View>

      {!esElOrganizador ? null : puedeMarcarUtilizada(compra) ? (
        <View style={estilos.acciones}>
          <Text style={tipografia.cuerpo}>¿El comprador ya ingresó al evento?</Text>
          <MensajeDeError mensaje={errorDeMarcar} style={estilos.error} />
          <Boton titulo="Marcar como utilizada" onPress={pedirConfirmacionDeUso} cargando={marcando} />
        </View>
      ) : motivoDeUso ? (
        <View style={estilos.separado}>
          <Text style={tipografia.suave}>{motivoDeUso}</Text>
          {plazoDePago ? <Text style={tipografia.suave}>{plazoDePago}</Text> : null}
        </View>
      ) : null}

      <Text style={estilos.seccion}>Seguimiento</Text>
      <SeguimientoCompra historial={compra.historial} />

      {compra.resenia ? (
        <>
          <Text style={estilos.seccion}>{esElComprador ? "Tu reseña" : "Reseña del comprador"}</Text>
          <View style={estilos.tarjeta}>
            <Text style={estilos.estrellas} accessibilityLabel={`${compra.resenia.puntuacion} de 5`}>
              {formatearEstrellas(compra.resenia.puntuacion)}
            </Text>
            <Text style={tipografia.cuerpo}>{compra.resenia.detalle}</Text>
            <Text style={tipografia.suave}>Publicada el {formatearFechaCorta(compra.resenia.fecha)}</Text>
          </View>
        </>
      ) : null}

      {esElComprador && puedeReseniar(compra) ? (
        <View style={estilos.acciones}>
          <Text style={tipografia.cuerpo}>Ya usaste esta entrada. ¿Cómo estuvo el evento?</Text>
          <Boton
            titulo="Dejar reseña"
            onPress={() => navigation.navigate("Resenia", { compraId: compra.id, nombreEvento: compra.evento.nombre })}
          />
        </View>
      ) : null}

      {!esElComprador ? null : puedeCancelar(compra) ? (
        <View style={estilos.acciones}>
          <MensajeDeError mensaje={errorDeCancelar} style={estilos.error} />
          <Boton titulo="Cancelar compra" variante="peligro" onPress={pedirConfirmacion} cargando={cancelando} />
        </View>
      ) : motivo ? (
        <Text style={[tipografia.suave, estilos.separado]}>{motivo}</Text>
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.l, gap: espacio.s, paddingBottom: espacio.xxl },
  dias: { color: colores.exito, fontSize: 16, fontFamily: fuentes.negrita },
  cancelado: { color: colores.error, fontSize: 15, fontFamily: fuentes.negrita },
  plazo: { color: colores.aviso, fontSize: 15, fontFamily: fuentes.seminegrita },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.l,
    gap: espacio.xs,
    marginTop: espacio.m,
  },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  total: { fontSize: 18, fontFamily: fuentes.negrita, color: colores.texto },
  separado: { marginTop: espacio.m },
  seccion: { ...tipografia.subtitulo, marginTop: espacio.xl, marginBottom: espacio.s },
  acciones: { marginTop: espacio.xl, gap: espacio.m },
  error: { color: colores.error, fontSize: 14, fontFamily: fuentes.seminegrita },
  aviso: { color: colores.exito, fontSize: 15, fontFamily: fuentes.negrita },
  estrellas: { fontFamily: fuentes.regular, color: colores.aviso, fontSize: 20, letterSpacing: 1 },
});
