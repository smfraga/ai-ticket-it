// La ruta de la foto de perfil de un usuario, con su versión (cambia con cada foto nueva, así el celular no muestra
// una vieja guardada), o null si no tiene. La app le antepone la dirección del servidor.
export const rutaDeFoto = (usuario) =>
  usuario?.foto ? `/usuarios/${usuario.id}/foto?v=${usuario.foto.version}` : null;
