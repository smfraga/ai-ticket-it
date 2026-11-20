import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import Boton from "../components/Boton";
import CampoTexto from "../components/CampoTexto";
import MensajeDeError from "../components/MensajeDeError";
import { mensajeDeError } from "../services/api";
import { colores, espacio, fuentes, tipografia } from "../theme";
import { erroresDeLogin, hayErrores, RESUMEN_DE_ERRORES } from "../utils/formularios";

export default function LoginScreen({ navigation }) {
  const { login, sesionExpirada } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState({}); // por campo
  const [error, setError] = useState(null); // el resumen o el del servidor
  const [enviando, setEnviando] = useState(false);

  const ingresar = async () => {
    const problemas = erroresDeLogin({ email, password });
    setErrores(problemas);
    if (hayErrores(problemas)) {
      setError(RESUMEN_DE_ERRORES);
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await login(email, password); // al iniciar sesión, el navegador cambia solo
    } catch (e) {
      // Credenciales incorrectas (401) o demasiados intentos (429): no es de un campo en particular.
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={estilos.pantalla}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <Text style={tipografia.titulo} accessibilityRole="header">
            AI Ticket It
          </Text>
          <Text style={tipografia.suave}>Ingresá para comprar entradas y seguir tus compras.</Text>

          {sesionExpirada ? (
            <MensajeDeError mensaje="Tu sesión venció. Ingresá de nuevo." style={estilos.aviso} />
          ) : null}

          <View style={estilos.formulario}>
            <CampoTexto
              etiqueta="Email"
              value={email}
              onChangeText={setEmail}
              error={errores.email}
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
              keyboardType="email-address"
            />
            <CampoTexto
              etiqueta="Contraseña"
              value={password}
              onChangeText={setPassword}
              error={errores.password}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
            />
            <MensajeDeError mensaje={error} />
            <Boton titulo="Ingresar" onPress={ingresar} cargando={enviando} />
            <Boton titulo="Crear cuenta" variante="secundario" onPress={() => navigation.navigate("Registro")} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { flexGrow: 1, justifyContent: "center", padding: espacio.xl, gap: espacio.m },
  formulario: { gap: espacio.l, marginTop: espacio.l },
  aviso: { color: colores.aviso, fontSize: 14, fontFamily: fuentes.seminegrita },
});
