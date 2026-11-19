import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Boton from "../components/Boton";
import FondoDelChat from "../components/FondoDelChat";
import GloboMensaje from "../components/GloboMensaje";
import SeparadorDeDia from "../components/SeparadorDeDia";
import useFondoChat from "../hooks/useFondoChat";
import { colores, espacio, fuentes, radio, tipografia } from "../theme";
import { FONDO_POR_DEFECTO, PALETA_DE_FONDOS } from "../utils/fondosChat";

const LADO_MUESTRA = 64;

// Mensajes de ejemplo para la vista previa (la hora es la de ahora).
const enviado = new Date().toISOString();
const DE_LA_OTRA_PARTE = {
  autor: { id: "ejemplo-otro", nombre: "Olivia", apellido: "Rossi", rol: "ORGANIZADOR" },
  mensaje: "¡Hola! Abrimos a las 20.",
  enviado,
};
const PROPIO = { autor: { id: "ejemplo-yo" }, mensaje: "¡Gracias! Nos vemos ahí.", enviado };

// Elegir el fondo de los chats: se guarda en este celular y vale para todos los chats.
export default function FondoChatScreen() {
  const { fondo, elegir, elegirImagenDeGaleria } = useFondoChat();
  const [abriendo, setAbriendo] = useState(false);

  const elegirImagen = async () => {
    setAbriendo(true);
    try {
      await elegirImagenDeGaleria();
    } catch {
      Alert.alert("No se pudo usar la imagen", "Probá con otra foto de la galería.");
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
      <FondoDelChat fondo={fondo} style={estilos.vistaPrevia}>
        <View style={estilos.mensajesDeEjemplo}>
          <SeparadorDeDia etiqueta="Hoy" />
          <GloboMensaje mensaje={DE_LA_OTRA_PARTE} propio={false} />
          <GloboMensaje mensaje={PROPIO} propio />
        </View>
      </FondoDelChat>

      <Text style={tipografia.etiqueta}>Imagen</Text>
      <Boton
        titulo={fondo.tipo === "imagen" ? "Elegir otra imagen" : "Elegir de la galería"}
        variante="secundario"
        cargando={abriendo}
        onPress={elegirImagen}
      />
      {fondo.tipo === "imagen" ? (
        <Boton titulo="Quitar la imagen" variante="peligro" onPress={() => elegir(FONDO_POR_DEFECTO)} />
      ) : null}

      <Text style={tipografia.etiqueta}>Colores</Text>
      <View style={estilos.grilla}>
        {PALETA_DE_FONDOS.map((opcion) => {
          const elegido = fondo.tipo === "color" && fondo.id === opcion.id;
          return (
            <Pressable
              key={opcion.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: elegido }}
              accessibilityLabel={`Fondo ${opcion.nombre}`}
              onPress={() => elegir({ tipo: "color", id: opcion.id })}
              style={estilos.opcion}
            >
              <View style={[estilos.muestra, { backgroundColor: opcion.color }, elegido && estilos.muestraElegida]}>
                {elegido ? <Ionicons name="checkmark" size={26} color={colores.primario} /> : null}
              </View>
              <Text style={[estilos.nombre, elegido && estilos.nombreElegido]}>{opcion.nombre}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={tipografia.suave}>El fondo se guarda en este celular y se usa en todos tus chats.</Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.l, gap: espacio.l },
  vistaPrevia: { borderRadius: radio.tarjeta, borderWidth: 1, borderColor: colores.borde, overflow: "hidden" },
  mensajesDeEjemplo: { padding: espacio.l, gap: espacio.s },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: espacio.l },
  opcion: { alignItems: "center", gap: espacio.xs, width: LADO_MUESTRA + espacio.l },
  muestra: {
    width: LADO_MUESTRA,
    height: LADO_MUESTRA,
    borderRadius: LADO_MUESTRA / 2,
    borderWidth: 2,
    borderColor: colores.bordeControl,
    alignItems: "center",
    justifyContent: "center",
  },
  muestraElegida: { borderColor: colores.primario, borderWidth: 3 },
  nombre: { fontFamily: fuentes.regular, fontSize: 13, color: colores.textoSuave },
  nombreElegido: { fontFamily: fuentes.seminegrita, color: colores.texto },
});
