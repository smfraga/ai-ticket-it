import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import Boton from "../components/Boton";
import { colores, espacio, tipografia } from "../theme";

const ETIQUETAS_DE_ROL = { COMPRADOR: "Comprador", ORGANIZADOR: "Organizador" };

export default function PerfilScreen() {
  const { usuario, logout } = useAuth();

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <View style={estilos.contenido}>
        <Text style={tipografia.titulo}>
          {usuario.nombre} {usuario.apellido}
        </Text>
        <Text style={tipografia.suave}>{usuario.email}</Text>
        <Text style={tipografia.suave}>{usuario.roles.map((rol) => ETIQUETAS_DE_ROL[rol] ?? rol).join(" y ")}</Text>
        <View style={estilos.accion}>
          <Boton titulo="Cerrar sesión" variante="secundario" onPress={logout} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.xl, gap: espacio.s },
  accion: { marginTop: espacio.xl },
});
