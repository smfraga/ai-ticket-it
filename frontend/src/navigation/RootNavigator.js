import Ionicons from "@expo/vector-icons/Ionicons";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { useMensajes } from "../auth/MensajesContext";
import Estado from "../components/Estado";
import CatalogoScreen from "../screens/CatalogoScreen";
import ChatScreen from "../screens/ChatScreen";
import ComprasDelEventoScreen from "../screens/ComprasDelEventoScreen";
import ConversacionesScreen from "../screens/ConversacionesScreen";
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
import { colores, fuentes } from "../theme";
import { insigniaDeNoLeidos } from "../utils/chat";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const tema = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colores.primario,
    background: colores.fondo,
    card: colores.superficie,
    text: colores.texto,
    border: colores.borde,
    notification: colores.primario,
  },
  fonts: {
    regular: { fontFamily: fuentes.regular, fontWeight: "normal" },
    medium: { fontFamily: fuentes.media, fontWeight: "normal" },
    bold: { fontFamily: fuentes.negrita, fontWeight: "normal" },
    heavy: { fontFamily: fuentes.negrita, fontWeight: "normal" },
  },
};

// Encabezado de las pantallas apiladas (detalle, chat, etc.): título en letra de cartel y volver en naranja.
const opcionesDePila = {
  headerTintColor: colores.primario,
  headerTitleStyle: { fontFamily: fuentes.cartel, fontSize: 24, color: colores.texto },
  headerBackTitleStyle: { fontFamily: fuentes.regular },
  headerStyle: { backgroundColor: colores.fondo },
  headerShadowVisible: false,
};

const EventosStackNav = createNativeStackNavigator();

// Dentro de la pestaña Eventos: del catálogo al detalle de un evento, con el botón de volver.
function EventosStack() {
  return (
    <EventosStackNav.Navigator screenOptions={opcionesDePila}>
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
    <ComprasStackNav.Navigator screenOptions={opcionesDePila}>
      <ComprasStackNav.Screen name="ListaDeCompras" component={MisComprasScreen} options={{ headerShown: false }} />
      <ComprasStackNav.Screen
        name="DetalleCompra"
        component={DetalleCompraScreen}
        options={{ title: "Compra", headerBackTitle: "Mis compras" }}
      />
      <ComprasStackNav.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: "Chat", headerBackTitle: "Compra" }}
      />
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
    <FavoritosStackNav.Navigator screenOptions={opcionesDePila}>
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
    <OrganizadorStackNav.Navigator screenOptions={opcionesDePila}>
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
      <OrganizadorStackNav.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: "Chat", headerBackTitle: "Compra" }}
      />
    </OrganizadorStackNav.Navigator>
  );
}

const MensajesStackNav = createNativeStackNavigator();

// Dentro de la pestaña Mensajes (todos): de la lista de chats al chat de una compra (el mismo ChatScreen).
function MensajesStack() {
  return (
    <MensajesStackNav.Navigator screenOptions={opcionesDePila}>
      <MensajesStackNav.Screen
        name="Conversaciones"
        component={ConversacionesScreen}
        options={{ headerShown: false }}
      />
      <MensajesStackNav.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: "Chat", headerBackTitle: "Mensajes" }}
      />
    </MensajesStackNav.Navigator>
  );
}

// Ícono de Ionicons por pestaña: lleno cuando está activa y de contorno cuando no.
const ICONOS_DE_PESTANIA = {
  Eventos: "search",
  MisCompras: "ticket",
  Favoritos: "heart",
  MisEventosTab: "calendar",
  Mensajes: "chatbubbles",
  Perfil: "person",
};

// El número de mensajes nuevos sobre el ícono, en naranja con texto oscuro (como el resto de la app).
const estilosDeInsignia = {
  backgroundColor: colores.primario,
  color: colores.textoSobrePrimario,
  fontFamily: fuentes.negrita,
  fontSize: 11,
};

const opcionesDePestania = ({ route }) => ({
  headerShown: false,
  tabBarActiveTintColor: colores.primario,
  tabBarInactiveTintColor: colores.textoSuave,
  tabBarStyle: { backgroundColor: colores.superficie, borderTopColor: colores.borde },
  tabBarLabelStyle: { fontFamily: fuentes.media },
  tabBarIcon: ({ focused, color, size }) => (
    <Ionicons
      name={focused ? ICONOS_DE_PESTANIA[route.name] : `${ICONOS_DE_PESTANIA[route.name]}-outline`}
      size={size}
      color={color}
    />
  ),
});

function TabsPrincipales() {
  const { esComprador, esOrganizador } = useAuth();
  const { totalNoLeidos } = useMensajes();

  return (
    <Tabs.Navigator screenOptions={opcionesDePestania}>
      <Tabs.Screen name="Eventos" component={EventosStack} />
      {esComprador ? (
        <Tabs.Screen name="MisCompras" component={ComprasStack} options={{ title: "Mis compras" }} />
      ) : null}
      {esComprador ? (
        <Tabs.Screen name="Favoritos" component={FavoritosStack} options={{ title: "Favoritos" }} />
      ) : null}
      {esOrganizador ? (
        <Tabs.Screen name="MisEventosTab" component={OrganizadorStack} options={{ title: "Mis eventos" }} />
      ) : null}
      <Tabs.Screen
        name="Mensajes"
        component={MensajesStack}
        options={{
          title: "Mensajes",
          tabBarBadge: insigniaDeNoLeidos(totalNoLeidos),
          tabBarBadgeStyle: estilosDeInsignia,
        }}
      />
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
