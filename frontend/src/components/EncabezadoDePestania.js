import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import { colores, espacio, fuentes, radio, tipografia } from "../theme";
import Avatar from "./Avatar";

// Título de una pestaña principal y, arriba a la derecha, la foto y el nombre de quien inició sesión. Tocarlos lleva
// a Perfil. La foto se actualiza sola: Perfil sincroniza el usuario de la sesión con GET /perfil.
export default function EncabezadoDePestania({ titulo }) {
  const { usuario } = useAuth();
  const navigation = useNavigation();

  return (
    <View style={estilos.fila}>
      <Text style={[tipografia.titulo, estilos.titulo]} numberOfLines={1}>
        {titulo}
      </Text>
      {usuario ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ir a mi perfil, ${usuario.nombre}`}
          hitSlop={8}
          onPress={() => navigation.navigate("Perfil")}
          style={({ pressed }) => [estilos.usuario, pressed && estilos.presionado]}
        >
          <Avatar persona={usuario} tamanio={32} />
          <Text style={estilos.nombre} numberOfLines={1}>
            {usuario.nombre}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.m },
  titulo: { flexShrink: 1 },
  usuario: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.s,
    paddingLeft: 4,
    paddingRight: espacio.m,
    paddingVertical: 4,
    borderRadius: radio.pastilla,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    maxWidth: 160,
  },
  presionado: { opacity: 0.7 },
  nombre: { fontFamily: fuentes.seminegrita, fontSize: 15, color: colores.texto, flexShrink: 1 },
});
