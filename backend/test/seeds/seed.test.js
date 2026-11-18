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

    it("las fechas son relativas a la fecha que se le pasa", async () => {
      const mañana = new Date(AHORA.getTime() + 24 * 60 * 60 * 1000);
      const otros = crearRepositorios();

      await cargarSeed(otros, mañana);

      const [primero] = await otros.eventos.findAll();
      expect(primero.fecha.getTime() - mañana.getTime()).toBe(12 * 24 * 60 * 60 * 1000);
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

    it("los eventos próximos tienen todo el cupo disponible", () => {
      eventos
        .filter((e) => !e.yaPaso(AHORA))
        .forEach((evento) => evento.tiposEntrada.forEach((tipo) => expect(tipo.vendidas).toBe(0)));
    });
  });

  describe("compras y reseñas de los eventos ya realizados", () => {
    it("carga 6 compras, todas UTILIZADAS, con su historial completo", () => {
      const compras = [...repos.compras.compras.values()];

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
      const compras = [...repos.compras.compras.values()];
      const resenias = [...repos.resenias.resenias.values()];

      expect(resenias).toHaveLength(6);
      expect(new Set(resenias.map((r) => r.compra))).toEqual(new Set(compras));
      resenias.forEach((resenia) => expect(resenia.comprador).toBe(resenia.compra.comprador));
    });

    it("los cupos vendidos coinciden con las cantidades de las compras", () => {
      const compras = [...repos.compras.compras.values()];

      eventos.forEach((evento) =>
        evento.tiposEntrada.forEach((tipo) => {
          const esperado = compras
            .filter((compra) => compra.tipoEntrada === tipo)
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
