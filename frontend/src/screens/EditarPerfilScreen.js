import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { useAuth } from "../auth/AuthContext";
import Boton from "../components/Boton";
import CampoTexto from "../components/CampoTexto";
import { mensajeDeError } from "../services/api";
import { editarPerfil } from "../services/perfilService";
import { colores, espacio, fuentes, tipografia } from "../theme";
import { errorDePerfil, LARGO_MAXIMO_DE_NOMBRE, perfilCambio } from "../utils/perfil";

// Editar nombre y apellido. El email y los roles no se cambian (se muestran como referencia).
export default function EditarPerfilScreen({ navigation }) {
  const { usuario, actualizarUsuario } = useAuth();
  const [datos, setDatos] = useState({ nombre: usuario.nombre, apellido: usuario.apellido });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (valor) => setDatos((previo) => ({ ...previo, [campo]: valor }));

  const guardar = async () => {
    const problema = errorDePerfil(datos);
    if (problema) {
      setError(problema);
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
          autoCapitalize="words"
          maxLength={LARGO_MAXIMO_DE_NOMBRE + 10}
        />
        <CampoTexto
          etiqueta="Apellido"
          value={datos.apellido}
          onChangeText={cambiar("apellido")}
          autoCapitalize="words"
          maxLength={LARGO_MAXIMO_DE_NOMBRE + 10}
        />
        <Text style={tipografia.suave}>
          Tu email ({usuario.email}) y tus roles no se pueden cambiar. Los demás ven tu nombre en el chat y en las
          compras.
        </Text>
        {error ? <Text style={estilos.error}>{error}</Text> : null}
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
