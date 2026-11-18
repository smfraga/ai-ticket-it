import { TooManyRequestsError } from "../errors/AppError.js";

// Límite de intentos por IP, en memoria. Con soloFallidos, los pedidos que terminan bien
// (status menor a 400) no cuentan. `ahora` se puede inyectar para probarlo sin esperar.
export function limitarIntentos({ maximo, ventanaMs, soloFallidos = false, ahora = Date.now }) {
  const intentosPorIp = new Map();

  const intentosVigentes = (ip, momento) => {
    const registro = intentosPorIp.get(ip);
    if (!registro || momento - registro.desde >= ventanaMs) {
      intentosPorIp.delete(ip);
      return null;
    }
    return registro;
  };

  const limpiarVencidos = setInterval(() => {
    const momento = ahora();
    for (const ip of intentosPorIp.keys()) intentosVigentes(ip, momento);
  }, ventanaMs);
  // Para que este temporizador no impida que el proceso termine.
  limpiarVencidos.unref();

  return (req, res, next) => {
    const momento = ahora();
    const registro = intentosVigentes(req.ip, momento) ?? { cantidad: 0, desde: momento };

    if (registro.cantidad >= maximo) {
      const segundosRestantes = Math.ceil((registro.desde + ventanaMs - momento) / 1000);
      res.set("Retry-After", String(segundosRestantes));
      return next(new TooManyRequestsError());
    }

    // Se cuenta apenas llega el pedido, así una ráfaga en paralelo no supera el máximo.
    registro.cantidad++;
    intentosPorIp.set(req.ip, registro);

    if (soloFallidos) {
      res.on("finish", () => {
        if (res.statusCode < 400 && registro.cantidad > 0) registro.cantidad--;
      });
    }
    next();
  };
}
