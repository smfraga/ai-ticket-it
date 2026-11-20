import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LADO_DE_FOTO } from "../utils/perfil";

// Abre la galería con recorte cuadrado (en iOS no pide permiso: el selector entrega solo la foto elegida), la achica
// a 256×256 y la comprime en JPEG: así pesa unos 20 KB, muy por debajo de los 64 KB que acepta el backend.
// Devuelve el data URL listo para mandar, o null si se cerró la galería sin elegir.
export async function elegirFotoDePerfil() {
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (resultado.canceled || !resultado.assets?.length) return null;

  const imagen = await ImageManipulator.manipulate(resultado.assets[0].uri)
    .resize({ width: LADO_DE_FOTO, height: LADO_DE_FOTO })
    .renderAsync();
  const guardada = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return `data:image/jpeg;base64,${guardada.base64}`;
}
