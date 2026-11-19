import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import Estado from "../components/Estado";
import CatalogoScreen from "../screens/CatalogoScreen";
import DetalleCompraScreen from "../screens/DetalleCompraScreen";
import DetalleEventoScreen from "../screens/DetalleEventoScreen";
import LoginScreen from "../screens/LoginScreen";
import MisComprasScreen from "../screens/MisComprasScreen";
import PerfilScreen from "../screens/PerfilScreen";
import RegistroScreen from "../screens/RegistroScreen";
import { colores } from "../theme";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const tema = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colores.primario, background: colores.fondo, card: colores.superficie, text: colores.texto, border: colores.borde },
};

const EventosStackNav = createNativeStackNavigator();

// Dentro de la pestaña Eventos: del catálogo al detalle de un evento, con el botón de volver.
function EventosStack() {
  return (
    <EventosStackNav.Navigator screenOptions={{ headerTintColor: colores.primario }}>
      <EventosStackNav.Screen name="Catalogo" component={CatalogoScreen} options={{ headerShown: false }} />
      <EventosStackNav.Screen
        name="DetalleEvento"
        component={DetalleEventoScreen}
        options={{ title: "Evento", headerBackTitle: "Eventos" }}
      />
    </EventosStackNav.Navigator>
  );
}

const ComprasStackNav = createNativeStackNavigator();

// Dentro de la pestaña Mis compras: de la lista al detalle de una compra.
function ComprasStack() {
  return (
    <ComprasStackNav.Navigator screenOptions={{ headerTintColor: colores.primario }}>
      <ComprasStackNav.Screen name="ListaDeCompras" component={MisComprasScreen} options={{ headerShown: false }} />
      <ComprasStackNav.Screen
        name="DetalleCompra"
        component={DetalleCompraScreen}
        options={{ title: "Compra", headerBackTitle: "Mis compras" }}
      />
    </ComprasStackNav.Navigator>
  );
}

function TabsPrincipales() {
  const { esComprador } = useAuth();

  return (
    <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colores.primario }}>
      <Tabs.Screen name="Eventos" component={EventosStack} />
      {esComprador ? <Tabs.Screen name="MisCompras" component={ComprasStack} options={{ title: "Mis compras" }} /> : null}
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
