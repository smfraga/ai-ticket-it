import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colores, tipografia } from "./src/theme";

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={estilos.contenedor}>
        <Text style={tipografia.titulo}>AI Ticket It</Text>
      </View>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo, alignItems: "center", justifyContent: "center" },
});
