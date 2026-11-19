import { StyleSheet, Text, View } from "react-native";
import { colores, espacio, fuentes, radio } from "../theme";
import { ETIQUETAS_DE_ROL_EN_LA_COMPRA } from "../utils/chat";
import { horaDelMensaje } from "../utils/fechasChat";

export default function GloboMensaje({ mensaje, propio }) {
  const { autor } = mensaje;

  return (
    <View style={[estilos.fila, propio ? estilos.filaPropia : estilos.filaAjena]}>
      <View style={[estilos.globo, propio ? estilos.globoPropio : estilos.globoAjeno]}>
        {!propio ? (
          <Text style={estilos.autor}>
            {autor.nombre} {autor.apellido} · {ETIQUETAS_DE_ROL_EN_LA_COMPRA[autor.rol] ?? autor.rol}
          </Text>
        ) : null}
        <Text style={[estilos.texto, propio && estilos.textoPropio]}>{mensaje.mensaje}</Text>
        <Text style={[estilos.hora, propio && estilos.horaPropia]}>{horaDelMensaje(mensaje.enviado)}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: "row" },
  filaPropia: { justifyContent: "flex-end" },
  filaAjena: { justifyContent: "flex-start" },
  globo: {
    maxWidth: "82%",
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.s,
    borderRadius: radio.tarjeta,
    gap: 2,
  },
  globoPropio: { backgroundColor: colores.primario, borderBottomRightRadius: 4 },
  globoAjeno: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderBottomLeftRadius: 4,
  },
  autor: { fontSize: 12, fontFamily: fuentes.negrita, color: colores.primarioOscuro },
  texto: { fontFamily: fuentes.regular, fontSize: 16, color: colores.texto },
  textoPropio: { color: colores.textoSobrePrimario },
  hora: { fontFamily: fuentes.regular, fontSize: 11, color: colores.textoSuave, alignSelf: "flex-end" },
  horaPropia: { color: colores.horaSobrePrimario },
});
