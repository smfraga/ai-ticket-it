import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { Appearance } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthContext";
import { FavoritosProvider } from "./src/auth/FavoritosContext";
import { MensajesProvider } from "./src/auth/MensajesContext";
import Estado from "./src/components/Estado";
import RootNavigator from "./src/navigation/RootNavigator";
import { archivosDeFuentes } from "./src/theme";

// La app es oscura siempre: así las alertas, el teclado y el selector de fecha de iOS también lo son,
// aunque el celular esté en modo claro.
Appearance.setColorScheme("dark");

export default function App() {
  // Si las fuentes no cargan (por ejemplo, sin conexión con Expo), la app sigue con las del sistema.
  const [fuentesCargadas, errorDeFuentes] = useFonts(archivosDeFuentes);
  const listo = fuentesCargadas || Boolean(errorDeFuentes);

  return (
    <SafeAreaProvider>
      {listo ? (
        <AuthProvider>
          <FavoritosProvider>
            <MensajesProvider>
              <RootNavigator />
            </MensajesProvider>
          </FavoritosProvider>
        </AuthProvider>
      ) : (
        <Estado tipo="cargando" />
      )}
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
