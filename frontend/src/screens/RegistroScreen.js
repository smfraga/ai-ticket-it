import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ROLES, useAuth } from "../auth/AuthContext";
import Boton from "../components/Boton";
import CampoTexto from "../components/CampoTexto";
import MensajeDeError from "../components/MensajeDeError";
import { mensajeDeError } from "../services/api";
import { ALTO_TOQUE, colores, espacio, fuentes, radio, tipografia } from "../theme";
import {
  erroresDeRegistro,
  erroresDelServidor,
  hayErrores,
  LARGO_MINIMO_DE_PASSWORD,
  RESUMEN_DE_ERRORES,
} from "../utils/formularios";

const CAMPOS = ["nombre", "apellido", "email", "password", "roles"];

const OPCIONES_DE_ROL = [
  { valor: ROLES.COMPRADOR, etiqueta: "Comprador" },
  { valor: ROLES.ORGANIZADOR, etiqueta: "Organizador" },
];

export default function RegistroScreen({ navigation }) {
  const { registro } = useAuth();
  const [datos, setDatos] = useState({ nombre: "", apellido: "", email: "", password: "" });
  const [roles, setRoles] = useState([ROLES.COMPRADOR]);
  const [errores, setErrores] = useState({}); // por campo
  const [error, setError] = useState(null); // el resumen o el del servidor
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (valor) => setDatos((previo) => ({ ...previo, [campo]: valor }));

  const alternarRol = (rol) =>
    setRoles((previos) => (previos.includes(rol) ? previos.filter((r) => r !== rol) : [...previos, rol]));

  const crearCuenta = async () => {
    const problemas = erroresDeRegistro(datos, roles);
    setErrores(problemas);
    if (hayErrores(problemas)) {
      setError(RESUMEN_DE_ERRORES);
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await registro({ ...datos, roles }); // al registrarse queda con la sesión iniciada
    } catch (e) {
      // Un 400 del backend se ubica en su campo; un 409 (email ya registrado) va como mensaje general.
      const delServidor = erroresDelServidor(e, CAMPOS);
      setErrores(delServidor);
      setError(hayErrores(delServidor) ? RESUMEN_DE_ERRORES : mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={estilos.pantalla}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <Text style={tipografia.titulo} accessibilityRole="header">
            Crear cuenta
          </Text>

          <CampoTexto
            etiqueta="Nombre"
            value={datos.nombre}
            onChangeText={cambiar("nombre")}
            error={errores.nombre}
            autoCapitalize="words"
            autoComplete="given-name"
            textContentType="givenName"
          />
          <CampoTexto
            etiqueta="Apellido"
            value={datos.apellido}
            onChangeText={cambiar("apellido")}
            error={errores.apellido}
            autoCapitalize="words"
            autoComplete="family-name"
            textContentType="familyName"
          />
          <CampoTexto
            etiqueta="Email"
            value={datos.email}
            onChangeText={cambiar("email")}
            error={errores.email}
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
          />
          <CampoTexto
            etiqueta={`Contraseña (al menos ${LARGO_MINIMO_DE_PASSWORD} caracteres)`}
            value={datos.password}
            onChangeText={cambiar("password")}
            error={errores.password}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <Text style={tipografia.etiqueta}>Quiero usar la app como</Text>
          <View style={estilos.roles}>
            {OPCIONES_DE_ROL.map(({ valor, etiqueta }) => {
              const elegido = roles.includes(valor);
              return (
                <Pressable
                  key={valor}
                  accessibilityRole="checkbox"
                  accessibilityLabel={etiqueta}
                  accessibilityHint={errores.roles || undefined}
                  accessibilityState={{ checked: elegido }}
                  onPress={() => alternarRol(valor)}
                  style={[estilos.rol, elegido && estilos.rolElegido, errores.roles && estilos.rolConError]}
                >
                  <Text style={[estilos.rolTexto, elegido && estilos.rolTextoElegido]}>{etiqueta}</Text>
                </Pressable>
              );
            })}
          </View>
          {errores.roles ? <Text style={estilos.error}>{errores.roles}</Text> : null}

          <MensajeDeError mensaje={error} />
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
  rolConError: { borderColor: colores.error, borderWidth: 2 },
  rolTexto: { fontFamily: fuentes.regular, fontSize: 16, color: colores.textoSuave },
  rolTextoElegido: { color: colores.primarioOscuro, fontFamily: fuentes.seminegrita },
  error: { fontFamily: fuentes.regular, color: colores.error, fontSize: 13 },
});
