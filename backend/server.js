import "dotenv/config";
import { app } from "./app.js";
import { cargarSeed } from "./seeds/seed.js";
import { CompraService } from "./services/CompraService.js";
import { programarVencimientos } from "./services/programarVencimientos.js";

if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET: copiá .env.example a .env y completalo (ver README).");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

// Los datos viven en memoria: se cargan de nuevo cada vez que arranca el servidor.
await cargarSeed();

// Las compras pendientes que no se pagan a tiempo se cancelan solas (cada minuto).
programarVencimientos(new CompraService());

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
