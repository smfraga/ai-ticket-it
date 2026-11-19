import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Boton from "../components/Boton";
import Estado from "../components/Estado";
import ReseniaItem from "../components/ReseniaItem";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { listarReseniasDelOrganizador, obtenerEvento } from "../services/eventosService";
import { colores, espacio, radio, tipografia } from "../theme";
import { formatearFecha, formatearPrecio } from "../utils/formato";

export default function DetalleEventoScreen({ route }) {
  const { eventoId } = route.params;
  const [evento, setEvento] = useState(null);
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

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
      <Text style={estilos.categoria}>{evento.categoria.nombre}</Text>
      <Text style={tipografia.titulo}>{evento.nombre}</Text>
      <Text style={tipografia.cuerpo}>{formatearFecha(evento.fecha)}</Text>
      {evento.yaPaso ? <Text style={estilos.aviso}>Este evento ya se realizó.</Text> : null}
      {evento.descripcion ? <Text style={[tipografia.cuerpo, estilos.descripcion]}>{evento.descripcion}</Text> : null}

      <Text style={estilos.seccion}>Entradas</Text>
      {evento.tiposEntrada.map((tipo) => (
        <View key={tipo.id} style={estilos.tipo}>
          <View style={estilos.tipoTexto}>
            <Text style={tipografia.subtitulo}>{tipo.nombre}</Text>
            {tipo.descripcion ? <Text style={tipografia.suave}>{tipo.descripcion}</Text> : null}
            <Text style={[tipografia.suave, tipo.disponibles === 0 && estilos.agotado]}>
              {tipo.disponibles === 0 ? "Agotado" : `${tipo.disponibles} de ${tipo.cupo} disponibles`}
            </Text>
          </View>
          <Text style={estilos.precio}>{formatearPrecio(tipo.precio)}</Text>
        </View>
      ))}

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
  descripcion: { marginTop: espacio.s },
  aviso: { color: colores.aviso, fontSize: 14, fontWeight: "600" },
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
  tipoTexto: { flex: 1, gap: espacio.xs },
  precio: { fontSize: 18, fontWeight: "700", color: colores.texto },
  agotado: { color: colores.error, fontWeight: "600" },
  errorResenias: { gap: espacio.m },
});
