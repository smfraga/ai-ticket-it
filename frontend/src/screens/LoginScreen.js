import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import Boton from "../components/Boton";
import CampoTexto from "../components/CampoTexto";
import { mensajeDeError } from "../services/api";
import { colores, espacio, fuentes, tipografia } from "../theme";

export default function LoginScreen({ navigation }) {
  const { login, sesionExpirada } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const ingresar = async () => {
    if (!email.trim() || !password) {
      setError("Completá el email y la contraseña");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await login(email, password); // al iniciar sesión, el navegador cambia solo
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={estilos.pantalla}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <Text style={tipografia.titulo}>AI Ticket It</Text>
          <Text style={tipografia.suave}>Ingresá para comprar entradas y seguir tus compras.</Text>

          {sesionExpirada ? <Text style={estilos.aviso}>Tu sesión venció. Ingresá de nuevo.</Text> : null}

          <View style={estilos.formulario}>
            <CampoTexto
              etiqueta="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
            <CampoTexto
              etiqueta="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            {error ? <Text style={estilos.error}>{error}</Text> : null}
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
  error: { fontFamily: fuentes.regular, color: colores.error, fontSize: 14 },
  aviso: { color: colores.aviso, fontSize: 14, fontFamily: fuentes.seminegrita },
});
