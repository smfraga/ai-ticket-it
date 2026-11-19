import { useCallback, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { FONDO_POR_DEFECTO, fondoDesdeGuardado, fondoParaGuardar, imagenQueSobra } from "../utils/fondosChat";

const CLAVE = "fondoDelChat";

// Borra del celular la imagen de un fondo que ya no se usa. Si no se puede, queda ocupando lugar, sin más.
function borrarImagen(uri) {
  try {
    const archivo = new File(uri);
    if (archivo.exists) archivo.delete();
  } catch {
    // Nada que hacer.
  }
}

// El fondo de los chats, guardado en el celular (no es un dato de la cuenta). Se vuelve a leer cada vez que la
// pantalla recibe el foco: así, al volver de elegir otro fondo, el chat ya lo muestra.
export default function useFondoChat() {
  const [fondo, setFondo] = useState(FONDO_POR_DEFECTO);
  const actual = useRef(FONDO_POR_DEFECTO);

  const mostrar = useCallback((nuevo) => {
    actual.current = nuevo;
    setFondo(nuevo);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      AsyncStorage.getItem(CLAVE)
        .then((texto) => {
          if (vigente) mostrar(fondoDesdeGuardado(texto));
        })
        .catch(() => {
          // Si no se puede leer, queda el fondo por defecto.
        });
      return () => {
        vigente = false;
      };
    }, [mostrar]),
  );

  // Se pinta al instante; si no se puede guardar, el cambio dura hasta salir de la pantalla.
  const elegir = useCallback(
    async (nuevo) => {
      const sobra = imagenQueSobra(actual.current, nuevo);
      mostrar(nuevo);
      try {
        await AsyncStorage.setItem(CLAVE, fondoParaGuardar(nuevo));
        if (sobra) borrarImagen(sobra);
      } catch {
        // Sin almacenamiento disponible: no hay nada más que hacer.
      }
    },
    [mostrar],
  );

  // Abre la galería (en iOS no pide permiso: el selector solo entrega la foto elegida) y guarda una copia en la
  // carpeta de la app: la que entrega el selector está en el caché y el sistema puede borrarla.
  // Devuelve false si quien usa la app cerró la galería sin elegir.
  const elegirImagenDeGaleria = useCallback(async () => {
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (resultado.canceled || !resultado.assets?.length) return false;
    const elegida = new File(resultado.assets[0].uri);
    const copia = new File(Paths.document, `fondo-chat-${Date.now()}.${elegida.extension?.replace(".", "") || "jpg"}`);
    await elegida.copy(copia);
    await elegir({ tipo: "imagen", uri: copia.uri });
    return true;
  }, [elegir]);

  return { fondo, elegir, elegirImagenDeGaleria };
}
