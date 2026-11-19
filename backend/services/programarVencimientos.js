export const INTERVALO_DE_VENCIMIENTO_MS = 60 * 1000;

// Corre el vencimiento de compras pendientes al arrancar y después cada `intervaloMs`. Se llama desde server.js
// (nunca desde app.js, para que los tests no dejen intervalos corriendo). Devuelve el intervalo, para poder cortarlo.
// Un error no corta el intervalo: se registra y se vuelve a intentar en la próxima vuelta.
export const programarVencimientos = (compraService, intervaloMs = INTERVALO_DE_VENCIMIENTO_MS, logger = console) => {
  const vencer = () =>
    compraService
      .vencerPendientes()
      .then((cantidad) => {
        if (cantidad > 0) logger.info(`Vencimiento automático: ${cantidad} compra(s) pendiente(s) cancelada(s)`);
      })
      .catch((error) => logger.error(`Falló el vencimiento automático de compras: ${error.message}`));

  vencer();
  return setInterval(vencer, intervaloMs);
};
