import Ionicons from "@expo/vector-icons/Ionicons";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import Estado from "../components/Estado";
import CatalogoScreen from "../screens/CatalogoScreen";
import ChatScreen from "../screens/ChatScreen";
import ComprasDelEventoScreen from "../screens/ComprasDelEventoScreen";
import CrearEventoScreen from "../screens/CrearEventoScreen";
import DetalleCompraScreen from "../screens/DetalleCompraScreen";
import DetalleEventoScreen from "../screens/DetalleEventoScreen";
import EditarEventoScreen from "../screens/EditarEventoScreen";
import FavoritosScreen from "../screens/FavoritosScreen";
import LoginScreen from "../screens/LoginScreen";
import MisComprasScreen from "../screens/MisComprasScreen";
import MisEventosScreen from "../screens/MisEventosScreen";
import PerfilScreen from "../screens/PerfilScreen";
import RegistroScreen from "../screens/RegistroScreen";
import ReseniaScreen from "../screens/ReseniaScreen";
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
      <ComprasStackNav.Screen name="Chat" component={ChatScreen} options={{ title: "Chat", headerBackTitle: "Compra" }} />
      <ComprasStackNav.Screen
        name="Resenia"
        component={ReseniaScreen}
        options={{ title: "Dejar reseña", headerBackTitle: "Compra" }}
      />
    </ComprasStackNav.Navigator>
  );
}

const FavoritosStackNav = createNativeStackNavigator();

// Dentro de la pestaña Favoritos (comprador): de la lista al detalle del evento, el mismo que en el catálogo.
function FavoritosStack() {
  return (
    <FavoritosStackNav.Navigator screenOptions={{ headerTintColor: colores.primario }}>
      <FavoritosStackNav.Screen name="ListaDeFavoritos" component={FavoritosScreen} options={{ headerShown: false }} />
      <FavoritosStackNav.Screen
        name="DetalleEvento"
        component={DetalleEventoScreen}
        options={{ title: "Evento", headerBackTitle: "Favoritos" }}
      />
    </FavoritosStackNav.Navigator>
  );
}

const OrganizadorStackNav = createNativeStackNavigator();

// Dentro de la pestaña Mis eventos (organizador): de sus eventos a las compras de uno, y de ahí al detalle
// y al chat de una compra (las mismas pantallas que usa el comprador).
function OrganizadorStack() {
  return (
    <OrganizadorStackNav.Navigator screenOptions={{ headerTintColor: colores.primario }}>
      <OrganizadorStackNav.Screen name="MisEventos" component={MisEventosScreen} options={{ headerShown: false }} />
      <OrganizadorStackNav.Screen
        name="CrearEvento"
        component={CrearEventoScreen}
        options={{ title: "Crear evento", headerBackTitle: "Mis eventos" }}
      />
      <OrganizadorStackNav.Screen
        name="EditarEvento"
        component={EditarEventoScreen}
        options={{ title: "Editar evento", headerBackTitle: "Compras" }}
      />
      <OrganizadorStackNav.Screen
        name="ComprasDelEvento"
        component={ComprasDelEventoScreen}
        options={{ title: "Compras del evento", headerBackTitle: "Mis eventos" }}
      />
      <OrganizadorStackNav.Screen
        name="DetalleCompra"
        component={DetalleCompraScreen}
        options={{ title: "Compra", headerBackTitle: "Compras" }}
      />
      <OrganizadorStackNav.Screen name="Chat" component={ChatScreen} options={{ title: "Chat", headerBackTitle: "Compra" }} />
    </OrganizadorStackNav.Navigator>
  );
}

// Ícono de Ionicons por pestaña: lleno cuando está activa y de contorno cuando no.
const ICONOS_DE_PESTANIA = {
  Eventos: "search",
  MisCompras: "ticket",
  Favoritos: "heart",
  MisEventosTab: "calendar",
  Perfil: "person",
};

const opcionesDePestania = ({ route }) => ({
  headerShown: false,
  tabBarActiveTintColor: colores.primario,
  tabBarIcon: ({ focused, color, size }) => (
    <Ionicons name={focused ? ICONOS_DE_PESTANIA[route.name] : `${ICONOS_DE_PESTANIA[route.name]}-outline`} size={size} color={color} />
  ),
});

function TabsPrincipales() {
  const { esComprador, esOrganizador } = useAuth();

  return (
    <Tabs.Navigator screenOptions={opcionesDePestania}>
      <Tabs.Screen name="Eventos" component={EventosStack} />
      {esComprador ? <Tabs.Screen name="MisCompras" component={ComprasStack} options={{ title: "Mis compras" }} /> : null}
      {esComprador ? <Tabs.Screen name="Favoritos" component={FavoritosStack} options={{ title: "Favoritos" }} /> : null}
      {esOrganizador ? (
        <Tabs.Screen name="MisEventosTab" component={OrganizadorStack} options={{ title: "Mis eventos" }} />
      ) : null}
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
