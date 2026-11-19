import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import Estado from "../components/Estado";
import CatalogoScreen from "../screens/CatalogoScreen";
import LoginScreen from "../screens/LoginScreen";
import PerfilScreen from "../screens/PerfilScreen";
import RegistroScreen from "../screens/RegistroScreen";
import { colores } from "../theme";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const tema = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colores.primario, background: colores.fondo, card: colores.superficie, text: colores.texto, border: colores.borde },
};

function TabsPrincipales() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colores.primario }}>
      <Tabs.Screen name="Catalogo" component={CatalogoScreen} options={{ title: "Eventos" }} />
      <Tabs.Screen name="Perfil" component={PerfilScreen} options={{ title: "Perfil" }} />
    </Tabs.Navigator>
  );
}

export default function RootNavigator() {
  const { estaAutenticado, cargando } = useAuth();

  if (cargando) return <Estado tipo="cargando" />;

  return (
    <NavigationContainer theme={tema}>
      {estaAutenticado ? (
        <TabsPrincipales />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Registro" component={RegistroScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
