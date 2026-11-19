import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { useFavoritos } from "../auth/FavoritosContext";
import Boton from "../components/Boton";
import BotonFavorito from "../components/BotonFavorito";
import Estado from "../components/Estado";
import GaleriaImagenes from "../components/GaleriaImagenes";
import PanelCompra from "../components/PanelCompra";
import ReseniaItem from "../components/ReseniaItem";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { listarReseniasDelOrganizador, obtenerEvento } from "../services/eventosService";
import { colores, espacio, radio, tipografia } from "../theme";
import { formatearFecha, formatearPrecio } from "../utils/formato";

export default function DetalleEventoScreen({ route }) {
  const { eventoId } = route.params;
  const { usuario, esComprador } = useAuth();
  const { esFavorito, alternar } = useFavoritos();
  const [evento, setEvento] = useState(null);
  const [tipoElegidoId, setTipoElegidoId] = useState(null);
  const [error, setError] = useState(null);
  const [reputacion, setReputacion] = useState(null); // { organizador, resenias }
  const [errorResenias, setErrorResenias] = useState(null);
  const nuevoPedido = useUltimoPedido();

  const cargar = useCallback(async () => {
    const esVigente = nuevoPedido();
    setError(null);
    setErrorResenias(null);
    let cargado;
    try {
      cargado = await obtenerEvento(eventoId);
    } catch (e) {
      if (esVigente()) setError(mensajeDeError(e));
      return;
    }
    if (!esVigente()) return;
    setEvento(cargado);

    // Las reseñas son las del organizador, de todos sus eventos. Si fallan, el evento se sigue viendo.
    try {
      const datos = await listarReseniasDelOrganizador(cargado.organizador.id);
      if (esVigente()) setReputacion(datos);
    } catch (e) {
      if (esVigente()) setErrorResenias(mensajeDeError(e));
    }
  }, [eventoId, nuevoPedido]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <Estado tipo="error" mensaje={error} onReintentar={cargar} />;
  if (!evento) return <Estado tipo="cargando" />;

  const { organizador } = evento;
  // Nadie compra en su propio evento (el backend responde 403): un usuario con los dos roles lo gestiona en Mis eventos.
  const esPropio = organizador.id === usuario.id;
  const sePuedeComprar = esComprador && !evento.yaPaso && !evento.cancelado && !esPropio;
  const tipoElegido = evento.tiposEntrada.find((tipo) => tipo.id === tipoElegidoId) ?? null;

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
      <GaleriaImagenes urls={evento.multimedia} />
      <Text style={estilos.categoria}>{evento.categoria.nombre}</Text>
      <View style={estilos.encabezado}>
        <Text style={[tipografia.titulo, estilos.titulo]}>{evento.nombre}</Text>
        {/* También en eventos ya realizados: el backend los acepta y la pestaña Favoritos los muestra. */}
        {esComprador ? (
          <BotonFavorito favorito={esFavorito(evento.id)} onPress={() => alternar(evento.id)} tamanio={30} />
        ) : null}
      </View>
      <Text style={tipografia.cuerpo}>{formatearFecha(evento.fecha)}</Text>
      {evento.cancelado ? (
        <Text style={estilos.cancelado}>El organizador canceló este evento: ya no se venden entradas.</Text>
      ) : evento.yaPaso ? (
        <Text style={estilos.aviso}>Este evento ya se realizó.</Text>
      ) : null}
      {evento.descripcion ? <Text style={[tipografia.cuerpo, estilos.descripcion]}>{evento.descripcion}</Text> : null}

      <Text style={estilos.seccion}>Entradas</Text>
      {sePuedeComprar ? <Text style={tipografia.suave}>Elegí un tipo de entrada para comprar.</Text> : null}
      {esPropio ? (
        <Text style={tipografia.suave}>Es tu evento: sus ventas están en Mis eventos.</Text>
      ) : !esComprador && !evento.yaPaso && !evento.cancelado ? (
        <Text style={tipografia.suave}>Para comprar necesitás una cuenta de comprador.</Text>
      ) : null}
      {evento.tiposEntrada.map((tipo) => {
        const elegible = sePuedeComprar && tipo.disponibles > 0;
        return (
          <Pressable
            key={tipo.id}
            disabled={!elegible}
            accessibilityRole={elegible ? "button" : undefined}
            accessibilityState={{ selected: tipo.id === tipoElegidoId }}
            onPress={() => setTipoElegidoId(tipo.id)}
            style={[estilos.tipo, tipo.id === tipoElegidoId && estilos.tipoElegido]}
          >
            <View style={estilos.tipoTexto}>
              <Text style={tipografia.subtitulo}>{tipo.nombre}</Text>
              {tipo.descripcion ? <Text style={tipografia.suave}>{tipo.descripcion}</Text> : null}
              <Text style={[tipografia.suave, tipo.disponibles === 0 && estilos.agotado]}>
                {tipo.disponibles === 0 ? "Agotado" : `${tipo.disponibles} de ${tipo.cupo} disponibles`}
              </Text>
            </View>
            <Text style={estilos.precio}>{formatearPrecio(tipo.precio)}</Text>
          </Pressable>
        );
      })}
      {sePuedeComprar && tipoElegido ? (
        <PanelCompra
          key={tipoElegido.id}
          eventoId={evento.id}
          tipo={tipoElegido}
          onComprada={cargar}
          onTerminar={() => setTipoElegidoId(null)}
        />
      ) : null}

      <Text style={estilos.seccion}>Organizador</Text>
      <Text style={tipografia.subtitulo}>
        {organizador.nombre} {organizador.apellido}
      </Text>
      {reputacion ? (
        <>
          <Text style={tipografia.suave}>
            {reputacion.organizador.puntaje === null
              ? "Todavía sin reseñas"
              : `★ ${reputacion.organizador.puntaje.toFixed(1)} · ${reputacion.organizador.cantidadResenias} ${
                  reputacion.organizador.cantidadResenias === 1 ? "reseña" : "reseñas"
                } de sus eventos anteriores`}
          </Text>
          {reputacion.resenias.map((resenia) => (
            <ReseniaItem key={resenia.id} resenia={resenia} />
          ))}
        </>
      ) : errorResenias ? (
        <View style={estilos.errorResenias}>
          <Text style={estilos.aviso}>No se pudieron cargar las reseñas: {errorResenias}</Text>
          <Boton titulo="Reintentar" variante="secundario" onPress={cargar} />
        </View>
      ) : (
        <Text style={tipografia.suave}>Cargando reseñas…</Text>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.l, gap: espacio.s, paddingBottom: espacio.xxl },
  categoria: { color: colores.primarioOscuro, fontSize: 13, fontWeight: "600" },
  encabezado: { flexDirection: "row", alignItems: "flex-start", gap: espacio.s },
  titulo: { flex: 1 },
  descripcion: { marginTop: espacio.s },
  aviso: { color: colores.aviso, fontSize: 14, fontWeight: "600" },
  cancelado: { color: colores.error, fontSize: 15, fontWeight: "700" },
  seccion: { ...tipografia.subtitulo, marginTop: espacio.xl },
  tipo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: espacio.m,
    backgroundColor: colores.superficie,
    borderRadius: radio.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.l,
  },
  tipoElegido: { borderColor: colores.primario, borderWidth: 2, backgroundColor: colores.primarioSuave },
  tipoTexto: { flex: 1, gap: espacio.xs },
  precio: { fontSize: 18, fontWeight: "700", color: colores.texto },
  agotado: { color: colores.error, fontWeight: "600" },
  errorResenias: { gap: espacio.m },
});
