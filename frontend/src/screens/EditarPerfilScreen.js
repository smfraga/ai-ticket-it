import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { useAuth } from "../auth/AuthContext";
import Boton from "../components/Boton";
import CampoTexto from "../components/CampoTexto";
import MensajeDeError from "../components/MensajeDeError";
import { mensajeDeError } from "../services/api";
import { editarPerfil } from "../services/perfilService";
import { colores, espacio, fuentes, tipografia } from "../theme";
import { hayErrores, RESUMEN_DE_ERRORES } from "../utils/formularios";
import { erroresDePerfil, LARGO_MAXIMO_DE_NOMBRE, perfilCambio } from "../utils/perfil";

// Editar nombre y apellido. El email y los roles no se cambian (se muestran como referencia).
export default function EditarPerfilScreen({ navigation }) {
  const { usuario, actualizarUsuario } = useAuth();
  const [datos, setDatos] = useState({ nombre: usuario.nombre, apellido: usuario.apellido });
  const [errores, setErrores] = useState({}); // por campo
  const [error, setError] = useState(null); // el resumen o el del servidor
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (valor) => setDatos((previo) => ({ ...previo, [campo]: valor }));

  const guardar = async () => {
    const problemas = erroresDePerfil(datos);
    setErrores(problemas);
    if (hayErrores(problemas)) {
      setError(RESUMEN_DE_ERRORES);
      return;
    }
    if (!perfilCambio(usuario, datos)) {
      navigation.goBack(); // nada que guardar
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const actualizado = await editarPerfil({ nombre: datos.nombre.trim(), apellido: datos.apellido.trim() });
      await actualizarUsuario(actualizado);
      navigation.popTo("PerfilInicio", { aviso: "¡Datos guardados!" });
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={estilos.pantalla}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <CampoTexto
          etiqueta="Nombre"
          value={datos.nombre}
          onChangeText={cambiar("nombre")}
          error={errores.nombre}
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          maxLength={LARGO_MAXIMO_DE_NOMBRE + 10}
        />
        <CampoTexto
          etiqueta="Apellido"
          value={datos.apellido}
          onChangeText={cambiar("apellido")}
          error={errores.apellido}
          autoCapitalize="words"
          autoComplete="family-name"
          textContentType="familyName"
          maxLength={LARGO_MAXIMO_DE_NOMBRE + 10}
        />
        <Text style={tipografia.suave}>
          Tu email ({usuario.email}) y tus roles no se pueden cambiar. Los demás ven tu nombre en el chat y en las
          compras.
        </Text>
        <MensajeDeError mensaje={error} style={estilos.error} />
        <Boton titulo="Guardar" onPress={guardar} cargando={enviando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.xl, gap: espacio.l },
  error: { color: colores.error, fontSize: 14, fontFamily: fuentes.seminegrita },
});
