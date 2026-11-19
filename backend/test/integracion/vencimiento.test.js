import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../app.js";
import { Categoria } from "../../domain/Categoria.js";
import { Compra } from "../../domain/Compra.js";
import { categoriaRepository } from "../../repositories/CategoriaRepository.js";
import { compraRepository } from "../../repositories/CompraRepository.js";
import { eventoRepository } from "../../repositories/EventoRepository.js";
import { usuarioRepository } from "../../repositories/UsuarioRepository.js";
import { CompraService } from "../../services/CompraService.js";
import { SECRETO_DE_PRUEBA } from "../helpers/sesion.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const enDias = (dias) => new Date(Date.now() + dias * MS_POR_DIA);

const registrar = async (email, roles) => {
  const { body } = await request(app)
    .post("/auth/registro")
    .send({ nombre: "Usuario", apellido: "De Prueba", password: "una-contraseña-larga", email, roles });
  return { token: body.token, id: body.usuario.id };
};

// Por la API, una compra nueva se confirma en el mismo request; para tener pendientes se crean con el dominio,
// como hace el seed, en los mismos repositorios que usa la app.
describe("Vencimiento de compras pendientes (API completa)", () => {
  let carla;
  let evento;
  let comprador;

  const pendienteDeHace = async (dias) =>
    compraRepository.save(new Compra(comprador, evento, evento.tiposEntrada[0], 1, enDias(-dias)));
  const comoCarla = (metodo, ruta) => request(app)[metodo](ruta).set("Authorization", `Bearer ${carla.token}`);

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRETO_DE_PRUEBA;
    const rock = await categoriaRepository.save(new Categoria("Rock", "Bandas en vivo"));
    const olivia = await registrar("olivia@example.com", ["ORGANIZADOR"]);
    carla = await registrar("carla@example.com", ["COMPRADOR"]);
    const { body } = await request(app)
      .post("/eventos")
      .set("Authorization", `Bearer ${olivia.token}`)
      .send({
        nombre: "Recital",
        categoriaId: rock.id,
        fecha: enDias(30).toISOString(),
        tiposEntrada: [{ nombre: "General", precio: 1000, cupo: 10 }],
      });
    evento = await eventoRepository.findById(body.id);
    comprador = await usuarioRepository.findById(carla.id);
  });

  it("una pendiente vigente muestra hasta cuándo se puede pagar", async () => {
    const compra = await pendienteDeHace(2);

    const { body } = await comoCarla("get", `/compras/${compra.id}`);

    expect(body.estado).toBe("PENDIENTE");
    expect(new Date(body.fechaLimiteDePago).getTime()).toBe(compra.historial[0].fechaHora.getTime() + 7 * MS_POR_DIA);
  });

  it("al vencer queda CANCELADA por AI Ticket It, libera el cupo y no muestra fecha límite", async () => {
    const compra = await pendienteDeHace(8);
    const antes = evento.tiposEntrada[0].disponibles();

    expect(await new CompraService().vencerPendientes()).toBeGreaterThanOrEqual(1);

    const { body } = await comoCarla("get", `/compras/${compra.id}`);
    expect(body.estado).toBe("CANCELADA");
    expect(body.fechaLimiteDePago).toBeNull();
    expect(body.historial.at(-1).quien).toEqual({ id: "sistema", nombre: "AI Ticket It", apellido: "" });
    expect(evento.tiposEntrada[0].disponibles()).toBe(antes + 1);
  });

  it("pagar una pendiente vencida que todavía no se procesó da 409", async () => {
    const compra = await pendienteDeHace(10);

    const respuesta = await comoCarla("post", `/compras/${compra.id}/pagar`);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.message).toBe("Venció el plazo para pagar esta compra");
  });
});
