import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ROLES, useAuth } from "../auth/AuthContext";
import Boton from "../components/Boton";
import CampoTexto from "../components/CampoTexto";
import { mensajeDeError } from "../services/api";
import { ALTO_TOQUE, colores, espacio, radio, tipografia } from "../theme";

const OPCIONES_DE_ROL = [
  { valor: ROLES.COMPRADOR, etiqueta: "Comprador" },
  { valor: ROLES.ORGANIZADOR, etiqueta: "Organizador" },
];

export default function RegistroScreen({ navigation }) {
  const { registro } = useAuth();
  const [datos, setDatos] = useState({ nombre: "", apellido: "", email: "", password: "" });
  const [roles, setRoles] = useState([ROLES.COMPRADOR]);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (valor) => setDatos((previo) => ({ ...previo, [campo]: valor }));

  const alternarRol = (rol) =>
    setRoles((previos) => (previos.includes(rol) ? previos.filter((r) => r !== rol) : [...previos, rol]));

  const crearCuenta = async () => {
    if (Object.values(datos).some((valor) => !valor.trim())) {
      setError("Completá todos los campos");
      return;
    }
    if (roles.length === 0) {
      setError("Elegí al menos un rol");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await registro({ ...datos, roles }); // al registrarse queda con la sesión iniciada
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={estilos.pantalla}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <Text style={tipografia.titulo}>Crear cuenta</Text>

          <CampoTexto etiqueta="Nombre" value={datos.nombre} onChangeText={cambiar("nombre")} autoCapitalize="words" />
          <CampoTexto
            etiqueta="Apellido"
            value={datos.apellido}
            onChangeText={cambiar("apellido")}
            autoCapitalize="words"
          />
          <CampoTexto
            etiqueta="Email"
            value={datos.email}
            onChangeText={cambiar("email")}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <CampoTexto
            etiqueta="Contraseña"
            value={datos.password}
            onChangeText={cambiar("password")}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={tipografia.etiqueta}>Quiero usar la app como</Text>
          <View style={estilos.roles}>
            {OPCIONES_DE_ROL.map(({ valor, etiqueta }) => {
              const elegido = roles.includes(valor);
              return (
                <Pressable
                  key={valor}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: elegido }}
                  onPress={() => alternarRol(valor)}
                  style={[estilos.rol, elegido && estilos.rolElegido]}
                >
                  <Text style={[estilos.rolTexto, elegido && estilos.rolTextoElegido]}>{etiqueta}</Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={estilos.error}>{error}</Text> : null}
          <Boton titulo="Crear cuenta" onPress={crearCuenta} cargando={enviando} />
          <Boton titulo="Ya tengo cuenta" variante="secundario" onPress={() => navigation.goBack()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.xl, gap: espacio.l },
  roles: { flexDirection: "row", gap: espacio.m },
  rol: {
    flex: 1,
    minHeight: ALTO_TOQUE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.control,
    backgroundColor: colores.superficie,
  },
  rolElegido: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  rolTexto: { fontSize: 16, color: colores.textoSuave },
  rolTextoElegido: { color: colores.primarioOscuro, fontWeight: "600" },
  error: { color: colores.error, fontSize: 14 },
});
