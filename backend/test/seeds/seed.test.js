import { beforeAll, describe, expect, it } from "@jest/globals";
import bcrypt from "bcryptjs";
import { calcularPuntaje } from "../../domain/Puntaje.js";
import { estadoCompra } from "../../domain/EstadoCompra.js";
import { rolUsuario } from "../../domain/RolUsuario.js";
import { CategoriaRepository } from "../../repositories/CategoriaRepository.js";
import { CompraRepository } from "../../repositories/CompraRepository.js";
import { EventoRepository } from "../../repositories/EventoRepository.js";
import { ResenaRepository } from "../../repositories/ResenaRepository.js";
import { UsuarioRepository } from "../../repositories/UsuarioRepository.js";
import { PASSWORD_DE_PRUEBA, cargarSeed } from "../../seeds/seed.js";
import { EventoService } from "../../services/EventoService.js";
import { AHORA } from "../helpers/domainFactories.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function crearRepositorios() {
  return {
    usuarios: new UsuarioRepository(),
    categorias: new CategoriaRepository(),
    eventos: new EventoRepository(),
    compras: new CompraRepository(),
    resenias: new ResenaRepository(),
  };
}

async function cargar() {
  const repositorios = crearRepositorios();
  await cargarSeed(repositorios, AHORA);
  return repositorios;
}

describe("cargarSeed", () => {
  let repos;
  let usuarios;
  let categorias;
  let eventos;

  beforeAll(async () => {
    repos = await cargar();
    usuarios = [...repos.usuarios.usuarios.values()];
    categorias = await repos.categorias.findAll();
    eventos = await repos.eventos.findAll();
  });

  describe("usuarios", () => {
    it("carga 2 organizadores y 2 compradores", () => {
      expect(usuarios).toHaveLength(4);
      expect(usuarios.filter((u) => u.tieneRol(rolUsuario.ORGANIZADOR))).toHaveLength(2);
      expect(usuarios.filter((u) => u.tieneRol(rolUsuario.COMPRADOR))).toHaveLength(2);
    });

    it("todos tienen la contraseña de prueba, guardada como hash", async () => {
      for (const usuario of usuarios) {
        expect(usuario.passwordHash).not.toBe(PASSWORD_DE_PRUEBA);
        expect(await bcrypt.compare(PASSWORD_DE_PRUEBA, usuario.passwordHash)).toBe(true);
      }
    });

    it("se pueden encontrar por email", async () => {
      expect((await repos.usuarios.findByEmail("olivia@example.com")).nombre).toBe("Olivia");
      expect((await repos.usuarios.findByEmail("camilo@example.com")).nombre).toBe("Camilo");
    });
  });

  describe("favoritos", () => {
    const favoritosDe = async (email) =>
      (await repos.usuarios.findByEmail(email)).listarFavoritos().map((evento) => evento.nombre);

    it("Carla tiene 2 favoritos, con el último guardado primero", async () => {
      expect(await favoritosDe("carla@example.com")).toEqual([
        "Festival de Jazz en el Parque",
        "Rock en el Río de la Plata",
      ]);
    });

    it("Camilo tiene 1 favorito", async () => {
      expect(await favoritosDe("camilo@example.com")).toEqual(["Noche de Stand Up"]);
    });

    it("los organizadores no tienen favoritos", async () => {
      for (const email of ["olivia@example.com", "octavio@example.com"]) {
        expect((await repos.usuarios.findByEmail(email)).favoritos).toEqual([]);
      }
    });

    it("los favoritos son los mismos eventos del repositorio, así que reflejan sus cupos", async () => {
      const [primero] = (await repos.usuarios.findByEmail("camilo@example.com")).favoritos;

      expect(primero).toBe(await repos.eventos.findById(primero.id));
    });
  });

  describe("categorías", () => {
    it("carga 5 categorías con nombre y descripción", () => {
      expect(categorias.map((c) => c.nombre)).toEqual([
        "Conferencias",
        "Deportes",
        "Festivales",
        "Recitales",
        "Teatro",
      ]);
      categorias.forEach((categoria) => expect(categoria.descripcion).not.toBe(""));
    });
  });

  describe("eventos", () => {
    it("carga 8 eventos: 5 próximos y 3 ya realizados", () => {
      expect(eventos).toHaveLength(8);
      expect(eventos.filter((e) => !e.yaPaso(AHORA))).toHaveLength(5);
      expect(eventos.filter((e) => e.yaPaso(AHORA))).toHaveLength(3);
    });

    it("el día es relativo a la fecha que se le pasa y la hora es fija (en hora local)", async () => {
      const mañana = new Date(AHORA.getTime() + 24 * 60 * 60 * 1000);
      const otros = crearRepositorios();

      await cargarSeed(otros, mañana);

      const [rock, standUp] = await otros.eventos.findAll();
      const enDiasALas = (dias, horas, minutos) => {
        const fecha = new Date(mañana);
        fecha.setDate(fecha.getDate() + dias);
        fecha.setHours(horas, minutos, 0, 0);
        return fecha;
      };
      expect(rock.fecha).toEqual(enDiasALas(12, 21, 0));
      expect(standUp.fecha).toEqual(enDiasALas(5, 21, 30));
    });

    it("cada evento tiene al menos una imagen, con URL https", () => {
      eventos.forEach((evento) => {
        expect(evento.multimedia.length).toBeGreaterThan(0);
        evento.multimedia.forEach((url) => expect(url).toMatch(/^https:\/\//));
      });
    });

    it("ningún evento queda a la hora en que arrancó el servidor: todos empiezan en punto o y media", () => {
      eventos.forEach((evento) => {
        expect([0, 30]).toContain(evento.fecha.getMinutes());
        expect(evento.fecha.getSeconds()).toBe(0);
      });
    });

    it("los dos organizadores tienen eventos, y los eventos usan al menos 4 categorías distintas", () => {
      const organizadores = new Set(eventos.map((e) => e.organizador.email));
      const categoriasUsadas = new Set(eventos.map((e) => e.categoria.id));

      expect(organizadores).toEqual(new Set(["olivia@example.com", "octavio@example.com"]));
      expect(categoriasUsadas.size).toBeGreaterThanOrEqual(4);
    });

    it("cada evento tiene 1 o más tipos de entrada con precio y cupo", () => {
      eventos.forEach((evento) => {
        expect(evento.tiposEntrada.length).toBeGreaterThanOrEqual(1);
        evento.tiposEntrada.forEach((tipo) => {
          expect(tipo.precio).toBeGreaterThan(0);
          expect(tipo.cupo).toBeGreaterThan(0);
        });
      });
    });

  });

  describe("compras de los eventos próximos", () => {
    const proximas = () => [...repos.compras.compras.values()].filter((c) => !c.evento.yaPaso(AHORA));

    it("carga 8 compras que cubren todos los estados salvo UTILIZADA", () => {
      expect(proximas()).toHaveLength(8);
      expect(new Set(proximas().map((c) => c.estado))).toEqual(
        new Set([
          estadoCompra.PENDIENTE,
          estadoCompra.CONFIRMADA,
          estadoCompra.CANCELADA,
          estadoCompra.REEMBOLSADA,
        ]),
      );
    });

    it("el historial de cada una termina en su estado y respeta las transiciones", () => {
      const historialDe = (estado) =>
        proximas()
          .find((c) => c.estado === estado)
          .historial.map((cambio) => cambio.estado);

      expect(historialDe(estadoCompra.PENDIENTE)).toEqual([estadoCompra.PENDIENTE]);
      expect(historialDe(estadoCompra.CONFIRMADA)).toEqual([estadoCompra.PENDIENTE, estadoCompra.CONFIRMADA]);
      expect(historialDe(estadoCompra.CANCELADA)).toEqual([estadoCompra.PENDIENTE, estadoCompra.CANCELADA]);
      expect(historialDe(estadoCompra.REEMBOLSADA)).toEqual([
        estadoCompra.PENDIENTE,
        estadoCompra.CONFIRMADA,
        estadoCompra.CANCELADA,
        estadoCompra.REEMBOLSADA,
      ]);
    });

    // Si el seed dejara una pendiente vencida, el vencimiento automático la cancelaría al arrancar el servidor.
    it("la PENDIENTE sigue vigente: vence al empezar su evento, que es antes de los 7 días", () => {
      const pendiente = proximas().find((c) => c.estado === estadoCompra.PENDIENTE);

      expect(pendiente.fechaLimiteDePago()).toEqual(pendiente.evento.fecha);
      expect(pendiente.fechaLimiteDePago().getTime()).toBeGreaterThan(AHORA.getTime());
      expect(pendiente.vencer(AHORA)).toBe(false);
    });

    it("las compras se hicieron antes de hoy", () => {
      proximas().forEach((compra) => expect(compra.historial[0].fechaHora.getTime()).toBeLessThan(AHORA.getTime()));
    });

    it("ocupan cupo las PENDIENTE y CONFIRMADA, y las CANCELADA y REEMBOLSADA lo liberaron", () => {
      const vendidas = (compra) => compra.tipoEntrada.vendidas;
      const canceladas = proximas().filter((c) =>
        [estadoCompra.CANCELADA, estadoCompra.REEMBOLSADA].includes(c.estado),
      );

      expect(canceladas).toHaveLength(3);
      canceladas.forEach((compra) => expect(vendidas(compra)).toBe(0));
    });

    // Para mostrar en la app una compra que canceló la plataforma.
    it("una compra de Carla venció sin pagar: la canceló el sistema en el momento en que venció", () => {
      const vencidas = proximas().filter((c) => c.historial.at(-1).quien.id === "sistema");

      expect(vencidas).toHaveLength(1);
      const [vencida] = vencidas;
      expect(vencida.comprador.email).toBe("carla@example.com");
      expect(vencida.evento.nombre).toBe("Congreso de Desarrollo de Software");
      expect(vencida.historial.map((c) => c.estado)).toEqual([estadoCompra.PENDIENTE, estadoCompra.CANCELADA]);
      const compradaEl = vencida.historial[0].fechaHora.getTime();
      expect(vencida.historial[1].fechaHora.getTime()).toBe(compradaEl + 7 * 24 * 60 * 60 * 1000);
      expect(vencida.historial[1].fechaHora.getTime()).toBeLessThan(AHORA.getTime());
    });

    it("dos compras tienen un chat entre el comprador y el organizador, en orden y ya enviado", () => {
      const conChat = proximas().filter((c) => c.mensajes.length > 0);

      expect(conChat.map((c) => c.mensajes.length).sort()).toEqual([1, 4]);
      conChat.forEach((compra) => {
        const fechas = compra.mensajes.map((m) => m.enviado.getTime());
        expect(fechas).toEqual([...fechas].sort((a, b) => a - b));
        fechas.forEach((fecha) => expect(fecha).toBeLessThan(AHORA.getTime()));
        compra.mensajes.forEach((m) => expect(compra.esParticipante(m.usuario)).toBe(true));
      });
    });

    it("la conversación larga alterna entre la compradora y la organizadora del evento", () => {
      const larga = proximas().find((c) => c.mensajes.length === 4);

      expect(larga.mensajes.map((m) => m.usuario.email)).toEqual([
        "carla@example.com",
        "olivia@example.com",
        "carla@example.com",
        "olivia@example.com",
      ]);
    });

    it("hay compras de los dos compradores y en eventos de los dos organizadores", () => {
      expect(new Set(proximas().map((c) => c.comprador.email))).toEqual(
        new Set(["carla@example.com", "camilo@example.com"]),
      );
      expect(new Set(proximas().map((c) => c.evento.organizador.email))).toEqual(
        new Set(["olivia@example.com", "octavio@example.com"]),
      );
    });
  });

  describe("compras y reseñas de los eventos ya realizados", () => {
    it("carga 6 compras UTILIZADAS, con su historial completo", () => {
      const compras = [...repos.compras.compras.values()].filter((c) => c.evento.yaPaso(AHORA));

      expect(compras).toHaveLength(6);
      compras.forEach((compra) => {
        expect(compra.estado).toBe(estadoCompra.UTILIZADA);
        expect(compra.historial.map((cambio) => cambio.estado)).toEqual([
          estadoCompra.PENDIENTE,
          estadoCompra.CONFIRMADA,
          estadoCompra.UTILIZADA,
        ]);
        expect(compra.evento.yaPaso(AHORA)).toBe(true);
      });
    });

    it("carga una reseña por compra, hecha por el comprador", () => {
      const compras = [...repos.compras.compras.values()].filter((c) => c.evento.yaPaso(AHORA));
      const resenias = [...repos.resenias.resenias.values()];

      expect(resenias).toHaveLength(6);
      expect(new Set(resenias.map((r) => r.compra))).toEqual(new Set(compras));
      resenias.forEach((resenia) => expect(resenia.comprador).toBe(resenia.compra.comprador));
    });

    it("los cupos vendidos coinciden con las cantidades de las compras que ocupan lugar", () => {
      const compras = [...repos.compras.compras.values()];
      const ocupan = [estadoCompra.PENDIENTE, estadoCompra.CONFIRMADA, estadoCompra.UTILIZADA];

      eventos.forEach((evento) =>
        evento.tiposEntrada.forEach((tipo) => {
          const esperado = compras
            .filter((compra) => compra.tipoEntrada === tipo && ocupan.includes(compra.estado))
            .reduce((total, compra) => total + compra.cantidad, 0);
          expect(tipo.vendidas).toBe(esperado);
        }),
      );
    });

    it("los dos organizadores quedan con puntajes distintos (4.5 y 2.5)", async () => {
      const olivia = await repos.usuarios.findByEmail("olivia@example.com");
      const octavio = await repos.usuarios.findByEmail("octavio@example.com");

      expect(calcularPuntaje(await repos.resenias.findByOrganizadorId(olivia.id))).toBe(4.5);
      expect(calcularPuntaje(await repos.resenias.findByOrganizadorId(octavio.id))).toBe(2.5);
    });
  });

  describe("ids fijos", () => {
    it("tienen formato UUID", () => {
      [...usuarios, ...categorias, ...eventos, ...eventos.flatMap((e) => e.tiposEntrada)].forEach((entidad) =>
        expect(entidad.id).toMatch(UUID),
      );
    });

    it("son únicos", () => {
      const ids = [...usuarios, ...categorias, ...eventos, ...eventos.flatMap((e) => e.tiposEntrada)].map(
        (entidad) => entidad.id,
      );

      expect(new Set(ids).size).toBe(ids.length);
    });

    it("son los mismos en cada carga, así los tokens siguen valiendo al reiniciar el servidor", async () => {
      const otra = await cargar();

      const idsDe = async (r) => ({
        usuarios: [...r.usuarios.usuarios.keys()],
        categorias: (await r.categorias.findAll()).map((c) => c.id),
        eventos: (await r.eventos.findAll()).map((e) => [e.id, e.tiposEntrada.map((t) => t.id)]),
      });

      expect(await idsDe(otra)).toEqual(await idsDe(repos));
    });
  });

  describe("junto con el EventoService", () => {
    it("el catálogo por defecto muestra los 5 próximos y por puntaje van primero los de Olivia", async () => {
      const service = new EventoService(repos.eventos, repos.categorias, repos.usuarios, repos.resenias, () => AHORA);

      const porDefecto = await service.buscar();
      const porPuntaje = await service.buscar({ orden: "puntaje" });

      expect(porDefecto).toHaveLength(5);
      expect(porPuntaje.map((e) => e.organizador.nombre)).toEqual(["Olivia", "Olivia", "Octavio", "Octavio", "Octavio"]);
      expect(porPuntaje.map((e) => e.organizador.puntaje)).toEqual([4.5, 4.5, 2.5, 2.5, 2.5]);
    });

    it("los eventos pasados se ven con periodo=pasados y muestran sus entradas vendidas", async () => {
      const service = new EventoService(repos.eventos, repos.categorias, repos.usuarios, repos.resenias, () => AHORA);

      const pasados = await service.buscar({ periodo: "pasados" });

      expect(pasados).toHaveLength(3);
      pasados.forEach((evento) => {
        expect(evento.yaPaso).toBe(true);
        expect(evento.tiposEntrada[0].disponibles).toBeLessThan(evento.tiposEntrada[0].cupo);
      });
    });
  });
});
