import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ORDENES, PERIODOS } from "../services/eventosService";
import { colores, espacio, radio, tipografia } from "../theme";
import { RANGOS_DE_PRECIO } from "../utils/eventos";
import Boton from "./Boton";
import Chip from "./Chip";

// Hoja que sube desde abajo con los filtros del catálogo. Cada toque se aplica en el momento (la lista de atrás se
// actualiza); "Listo" o tocar fuera la cierra y "Limpiar" vuelve todo a los valores por defecto.
export default function HojaDeFiltros({ visible, filtros, categorias, onCambiar, onLimpiar, onCerrar }) {
  const margenes = useSafeAreaInsets();
  const opcionesDeCategoria = [{ valor: null, etiqueta: "Todas" }].concat(
    categorias.map((categoria) => ({ valor: categoria.id, etiqueta: categoria.nombre })),
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={estilos.contenedor}>
        <Pressable style={estilos.fondo} onPress={onCerrar} accessibilityLabel="Cerrar los filtros" />
        <View style={[estilos.hoja, { paddingBottom: margenes.bottom + espacio.m }]}>
          <View style={estilos.agarre} />
          <Text style={tipografia.subtitulo}>Filtros</Text>
          <ScrollView contentContainerStyle={estilos.secciones}>
            <Seccion
              titulo="Categoría"
              opciones={opcionesDeCategoria}
              valor={filtros.categoriaId}
              clave="categoriaId"
              onCambiar={onCambiar}
            />
            <Seccion
              titulo="Mostrar"
              opciones={PERIODOS}
              valor={filtros.periodo}
              clave="periodo"
              onCambiar={onCambiar}
            />
            <Seccion
              titulo="Precio"
              opciones={RANGOS_DE_PRECIO}
              valor={filtros.rangoDePrecio}
              clave="rangoDePrecio"
              onCambiar={onCambiar}
            />
            <Seccion
              titulo="Ordenar por"
              opciones={ORDENES}
              valor={filtros.orden}
              clave="orden"
              onCambiar={onCambiar}
            />
          </ScrollView>
          <View style={estilos.botones}>
            <View style={estilos.boton}>
              <Boton titulo="Limpiar" variante="secundario" onPress={onLimpiar} />
            </View>
            <View style={estilos.boton}>
              <Boton titulo="Listo" onPress={onCerrar} fondoDetras={colores.superficie} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Seccion({ titulo, opciones, valor, clave, onCambiar }) {
  return (
    <View style={estilos.seccion}>
      <Text style={tipografia.etiqueta}>{titulo}</Text>
      <View style={estilos.chips}>
        {opciones.map((opcion) => (
          <Chip
            key={String(opcion.valor)}
            etiqueta={opcion.etiqueta}
            activo={valor === opcion.valor}
            onPress={() => onCambiar(clave, opcion.valor)}
          />
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: "flex-end" },
  fondo: { ...StyleSheet.absoluteFillObject, backgroundColor: colores.capaSobreFoto },
  hoja: {
    maxHeight: "85%",
    backgroundColor: colores.superficie,
    borderTopLeftRadius: radio.tarjeta,
    borderTopRightRadius: radio.tarjeta,
    paddingHorizontal: espacio.l,
    paddingTop: espacio.s,
    gap: espacio.m,
  },
  agarre: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colores.borde,
    marginBottom: espacio.xs,
  },
  secciones: { gap: espacio.l, paddingBottom: espacio.s },
  seccion: { gap: espacio.s },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: espacio.s },
  botones: { flexDirection: "row", gap: espacio.m },
  boton: { flex: 1 },
});
