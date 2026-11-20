// El tipo de una imagen se decide por los primeros bytes del archivo y no por lo que diga quien la manda.
// Lo usan la foto de perfil (`Usuario`) y las imágenes de un evento (`Evento`).
const FIRMAS_DE_IMAGEN = [
  { tipo: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { tipo: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

// "image/jpeg", "image/png" o null si los bytes no son de ninguno de los dos.
export const tipoDeImagen = (datos) =>
  FIRMAS_DE_IMAGEN.find(({ bytes }) => bytes.every((byte, i) => datos[i] === byte))?.tipo ?? null;
