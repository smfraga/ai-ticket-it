import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { FONDO_POR_DEFECTO, fondoDesdeGuardado, fondoParaGuardar } from "../utils/fondosChat";

const CLAVE = "fondoDelChat";

// El fondo de los chats, guardado en el celular (no es un dato de la cuenta). Se vuelve a leer cada vez que la
// pantalla recibe el foco: así, al volver de elegir otro fondo, el chat ya lo muestra.
export default function useFondoChat() {
  const [fondo, setFondo] = useState(FONDO_POR_DEFECTO);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      AsyncStorage.getItem(CLAVE)
        .then((texto) => {
          if (vigente) setFondo(fondoDesdeGuardado(texto));
        })
        .catch(() => {
          // Si no se puede leer, queda el fondo por defecto.
        });
      return () => {
        vigente = false;
      };
    }, []),
  );

  // Se pinta al instante; si no se puede guardar, el cambio dura hasta salir de la pantalla.
  const elegir = useCallback(async (nuevo) => {
    setFondo(nuevo);
    try {
      await AsyncStorage.setItem(CLAVE, fondoParaGuardar(nuevo));
    } catch {
      // Sin almacenamiento disponible: no hay nada más que hacer.
    }
  }, []);

  return { fondo, elegir };
}
