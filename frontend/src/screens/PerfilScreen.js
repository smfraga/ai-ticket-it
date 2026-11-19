import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import Boton from "../components/Boton";
import { colores, espacio, fuentes, tipografia } from "../theme";

const ETIQUETAS_DE_ROL = { COMPRADOR: "Comprador", ORGANIZADOR: "Organizador" };

// `aviso`: lo manda la pantalla de la que se viene ("¡Datos guardados!").
export default function PerfilScreen({ navigation, route }) {
  const { usuario, logout } = useAuth();
  const aviso = route.params?.aviso;

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <View style={estilos.contenido}>
        <Text style={tipografia.titulo}>
          {usuario.nombre} {usuario.apellido}
        </Text>
        <Text style={tipografia.suave}>{usuario.email}</Text>
        <Text style={tipografia.suave}>{usuario.roles.map((rol) => ETIQUETAS_DE_ROL[rol] ?? rol).join(" y ")}</Text>
        {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}
        <View style={estilos.acciones}>
          <Boton titulo="Editar perfil" variante="secundario" onPress={() => navigation.navigate("EditarPerfil")} />
          <Boton titulo="Cerrar sesión" variante="secundario" onPress={logout} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.xl, gap: espacio.s },
  aviso: { color: colores.exito, fontSize: 15, fontFamily: fuentes.negrita, marginTop: espacio.s },
  acciones: { marginTop: espacio.xl, gap: espacio.m },
});
