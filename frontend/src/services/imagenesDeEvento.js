import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

// Lado mayor de cada imagen: alcanza para la galería del detalle y deja cada foto en unos 150 KB en JPEG 0,6, muy por
// debajo de los 400 KB que acepta el backend.
const LADO_MAYOR = 1080;
const CALIDAD = 0.6;

// Abre la galería para elegir varias imágenes a la vez, hasta `cantidadMaxima` (lo que falta para llegar a 6). En
// iOS no pide permiso: el selector entrega solo las fotos elegidas. Cada una se achica (sin recortar) y se comprime.
// Devuelve [{ uri, dataUrl }]: `uri` para la miniatura y `dataUrl` para subirla. [] si se cerró sin elegir.
export async function elegirImagenesDeEvento(cantidadMaxima) {
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: cantidadMaxima,
    orderedSelection: true,
    quality: 1,
  });
  if (resultado.canceled || !resultado.assets?.length) return [];

  const elegidas = resultado.assets.slice(0, cantidadMaxima);
  const imagenes = [];
  for (const { uri, width, height } of elegidas) {
    // Se achica por el lado mayor, así una foto vertical tampoco pasa de 1080 px; si ya es chica, queda igual.
    const tamanio = width >= height ? { width: Math.min(width, LADO_MAYOR) } : { height: Math.min(height, LADO_MAYOR) };
    const imagen = await ImageManipulator.manipulate(uri).resize(tamanio).renderAsync();
    const guardada = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: CALIDAD, base64: true });
    imagenes.push({ uri: guardada.uri, dataUrl: `data:image/jpeg;base64,${guardada.base64}` });
  }
  return imagenes;
}
