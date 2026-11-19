import { Categoria } from "../domain/Categoria.js";
import { Compra } from "../domain/Compra.js";
import { estadoCompra } from "../domain/EstadoCompra.js";
import { Evento } from "../domain/Evento.js";
import { Resenia } from "../domain/Resenia.js";
import { rolUsuario } from "../domain/RolUsuario.js";
import { TipoEntrada } from "../domain/TipoEntrada.js";
import { Usuario } from "../domain/Usuario.js";
import { categoriaRepository } from "../repositories/CategoriaRepository.js";
import { compraRepository } from "../repositories/CompraRepository.js";
import { eventoRepository } from "../repositories/EventoRepository.js";
import { resenaRepository } from "../repositories/ResenaRepository.js";
import { usuarioRepository } from "../repositories/UsuarioRepository.js";
import { hashearPassword } from "../services/AuthService.js";

export const PASSWORD_DE_PRUEBA = "Demo1234!";

const { COMPRADOR, ORGANIZADOR } = rolUsuario;
const MS_POR_HORA = 60 * 60 * 1000;
const MS_POR_DIA = 24 * MS_POR_HORA;

const sumarDias = (fecha, dias) => new Date(fecha.getTime() + dias * MS_POR_DIA);

// El día del evento es relativo a hoy, pero la hora es fija ("21:30"), en la hora local del servidor:
// así una noche de stand up no queda a la hora en que arrancó el backend.
const fechaDeEvento = (ahora, dias, hora) => {
  const [horas, minutos] = hora.split(":").map(Number);
  const fecha = sumarDias(ahora, dias);
  fecha.setHours(horas, minutos, 0, 0);
  return fecha;
};

// Los usuarios, categorías, eventos y tipos de entrada del seed tienen ids fijos (con formato UUID).
// Así, cuando el servidor se reinicia, los tokens que ya se emitieron siguen apuntando a los mismos usuarios.
const GRUPOS_DE_IDS = { usuario: 1, categoria: 2, evento: 3, tipoEntrada: 4 };
const idFijo = (grupo, numero) => `00000000-0000-4000-8000-${GRUPOS_DE_IDS[grupo]}${String(numero).padStart(11, "0")}`;

const USUARIOS = [
  { nombre: "Olivia", apellido: "Rossi", email: "olivia@example.com", roles: [ORGANIZADOR] },
  { nombre: "Octavio", apellido: "Benítez", email: "octavio@example.com", roles: [ORGANIZADOR] },
  { nombre: "Carla", apellido: "Gómez", email: "carla@example.com", roles: [COMPRADOR] },
  { nombre: "Camilo", apellido: "Díaz", email: "camilo@example.com", roles: [COMPRADOR] },
];

const CATEGORIAS = [
  { nombre: "Recitales", descripcion: "Música en vivo: bandas y solistas" },
  { nombre: "Teatro", descripcion: "Obras, stand up y espectáculos escénicos" },
  { nombre: "Festivales", descripcion: "Varios artistas, uno o más días" },
  { nombre: "Conferencias", descripcion: "Charlas, congresos y encuentros" },
  { nombre: "Deportes", descripcion: "Partidos, carreras y torneos" },
];

// `organizador` y `categoria` son posiciones en USUARIOS y CATEGORIAS; `dias` es relativo a hoy
// (positivo: todavía no se hizo; negativo: ya se realizó) y `hora` es la hora local de inicio.
// `multimedia` son fotos de Unsplash (uso libre) acordes a cada evento; se verificó que cada URL responda una imagen.
const EVENTOS = [
  {
    nombre: "Rock en el Río de la Plata",
    hora: "21:00",
    multimedia: [
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=70",
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=70",
    ],
    descripcion: "Una noche de rock nacional con las bandas más escuchadas del año.",
    categoria: 0,
    organizador: 0,
    dias: 12,
    tipos: [
      ["General", "Campo, de pie", 12000, 300],
      ["Platea", "Sector con butacas", 25000, 100],
      ["VIP", "Primera fila y acceso al backstage", 45000, 30],
    ],
  },
  {
    nombre: "Noche de Stand Up",
    hora: "21:30",
    multimedia: [
      "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=70",
      "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=70",
    ],
    descripcion: "Seis humoristas en un mismo escenario. Humor para toda la noche.",
    categoria: 1,
    organizador: 1,
    dias: 5,
    tipos: [
      ["General", "Sillas numeradas", 6000, 120],
      ["Mesa preferencial", "Mesa para cuatro cerca del escenario", 9000, 40],
    ],
  },
  {
    nombre: "Festival de Jazz en el Parque",
    hora: "17:00",
    multimedia: ["https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=70"],
    descripcion: "Jazz en vivo al aire libre, con feria gastronómica y de diseño.",
    categoria: 2,
    organizador: 0,
    dias: 30,
    tipos: [
      ["Anticipada", "Precio de lanzamiento", 8000, 500],
      ["General", "Entrada del día", 11000, 1500],
    ],
  },
  {
    nombre: "Congreso de Desarrollo de Software",
    hora: "09:00",
    multimedia: ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=70"],
    descripcion: "Dos jornadas de charlas y talleres sobre desarrollo, testing e inteligencia artificial.",
    categoria: 3,
    organizador: 1,
    dias: 20,
    tipos: [
      ["Estudiante", "Con credencial vigente", 3000, 200],
      ["Profesional", "Incluye almuerzo y certificado", 15000, 150],
    ],
  },
  {
    nombre: "Clásico de Fútbol Amateur",
    hora: "15:30",
    multimedia: ["https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=70"],
    descripcion: "El partido más esperado del torneo de ligas barriales.",
    categoria: 4,
    organizador: 1,
    dias: 9,
    tipos: [
      ["Popular", "Sin ubicación asignada", 4000, 800],
      ["Platea", "Tribuna techada", 9000, 200],
    ],
  },
  {
    nombre: "Obra: El Gran Teatro del Mundo",
    hora: "20:00",
    multimedia: ["https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=70"],
    descripcion: "Una puesta clásica con elenco estable y vestuario de época.",
    categoria: 1,
    organizador: 0,
    dias: -25,
    tipos: [["Platea", "Butacas numeradas", 7000, 150]],
  },
  {
    nombre: "Recital Aniversario Folklore",
    hora: "21:00",
    multimedia: ["https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=70"],
    descripcion: "Guitarreada con peñas invitadas para festejar el aniversario.",
    categoria: 0,
    organizador: 1,
    dias: -12,
    tipos: [["General", "Sillas y mesas compartidas", 9000, 200]],
  },
  {
    nombre: "Maratón Solidaria 10K",
    hora: "08:00",
    multimedia: [
      "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&q=70",
      "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800&q=70",
    ],
    descripcion: "Carrera de 10 kilómetros a beneficio de comedores barriales.",
    categoria: 4,
    organizador: 0,
    dias: -40,
    tipos: [["Inscripción", "Incluye remera y kit del corredor", 2500, 400]],
  },
];

// Eventos favoritos de los compradores, en el orden en que los guardaron: `comprador` es una posición en USUARIOS
// y `eventos` posiciones en EVENTOS. Carla ve primero el festival de jazz (el último que guardó).
const FAVORITOS = [
  { comprador: 2, eventos: [0, 2] },
  { comprador: 3, eventos: [1] },
];

// Compras de eventos ya realizados (por eso quedan UTILIZADAS), cada una con su reseña.
// `evento` es una posición en EVENTOS, `tipo` una posición en sus tipos de entrada y `comprador` en USUARIOS.
// Puntajes resultantes: Olivia (5, 4, 5 y 4) promedia 4.5 y Octavio (3 y 2) promedia 2.5.
const COMPRAS_CON_RESENIA = [
  {
    evento: 5,
    tipo: 0,
    comprador: 2,
    cantidad: 2,
    puntuacion: 5,
    detalle: "Una puesta increíble, el elenco estuvo impecable.",
  },
  {
    evento: 5,
    tipo: 0,
    comprador: 3,
    cantidad: 1,
    puntuacion: 4,
    detalle: "Muy buena actuación, el sonido podía estar mejor.",
  },
  {
    evento: 7,
    tipo: 0,
    comprador: 2,
    cantidad: 1,
    puntuacion: 5,
    detalle: "Muy bien organizada, los puestos de hidratación estaban a tiempo.",
  },
  {
    evento: 7,
    tipo: 0,
    comprador: 3,
    cantidad: 2,
    puntuacion: 4,
    detalle: "Linda experiencia, la entrega de remeras se demoró un poco.",
  },
  {
    evento: 6,
    tipo: 0,
    comprador: 2,
    cantidad: 3,
    puntuacion: 3,
    detalle: "Buena música, pero el show empezó una hora tarde.",
  },
  {
    evento: 6,
    tipo: 0,
    comprador: 3,
    cantidad: 1,
    puntuacion: 2,
    detalle: "Mucha espera en el ingreso y poco lugar para sentarse.",
  },
];

// Compras de eventos próximos, para tener datos en todos los estados salvo UTILIZADA (que solo tiene sentido
// después del evento). `diasAtras` es cuándo se hizo la compra, relativo a hoy, y `estado` el estado final:
// PENDIENTE (sin pagar), CONFIRMADA, CANCELADA (se canceló sin pagar) o REEMBOLSADA (se pagó y se canceló).
// `mensajes` (opcional) es el chat de la compra: [quién escribe, horas después de la compra, texto].
// `vencida: true` (con estado CANCELADA): no se pagó a tiempo y la canceló la plataforma al vencer el plazo de pago.
const COMPRAS_PROXIMAS = [
  {
    evento: 0,
    tipo: 0,
    comprador: 2,
    cantidad: 2,
    diasAtras: 6,
    estado: estadoCompra.CONFIRMADA,
    mensajes: [
      ["comprador", 2, "Hola, ¿a qué hora abren las puertas?"],
      ["organizador", 5, "¡Hola, Carla! Abrimos a las 20 y la banda sale a las 22."],
      ["comprador", 6, "Perfecto, gracias. ¿Se puede entrar con mochila chica?"],
      ["organizador", 20, "Sí, hasta 30 cm de largo y pasa por el control de seguridad."],
      // Ayer (24 h antes de cargar el seed) y hoy (1 minuto antes), para que el chat muestre "Ayer" y "Hoy"
      // a cualquier hora en que arranque el backend.
      ["comprador", 6 * 24 - 24, "¿Puedo mostrar la entrada en el celular o hay que imprimirla?"],
      ["organizador", 6 * 24 - 1 / 60, "Con el celular alcanza: en la puerta te buscamos por nombre."],
    ],
  },
  { evento: 0, tipo: 2, comprador: 3, cantidad: 1, diasAtras: 3, estado: estadoCompra.CONFIRMADA },
  { evento: 1, tipo: 0, comprador: 2, cantidad: 4, diasAtras: 4, estado: estadoCompra.CONFIRMADA },
  {
    evento: 1,
    tipo: 1,
    comprador: 3,
    cantidad: 1,
    diasAtras: 1,
    estado: estadoCompra.PENDIENTE,
    mensajes: [["comprador", 1, "Buenas, ¿la mesa preferencial incluye consumición?"]],
  },
  { evento: 2, tipo: 0, comprador: 2, cantidad: 2, diasAtras: 8, estado: estadoCompra.CANCELADA },
  { evento: 3, tipo: 1, comprador: 3, cantidad: 1, diasAtras: 5, estado: estadoCompra.REEMBOLSADA },
  { evento: 4, tipo: 0, comprador: 2, cantidad: 3, diasAtras: 2, estado: estadoCompra.CONFIRMADA },
  // Carla reservó el congreso hace 10 días y no pagó: venció hace 3 días. Su consulta, sin respuesta, es la más
  // vieja de los chats (en la app se ve con la fecha completa).
  {
    evento: 3,
    tipo: 0,
    comprador: 2,
    cantidad: 1,
    diasAtras: 10,
    estado: estadoCompra.CANCELADA,
    vencida: true,
    mensajes: [["comprador", 2, "Hola, ¿el congreso entrega certificado de asistencia?"]],
  },
];

export async function cargarSeed(repositorios = {}, ahora = new Date()) {
  const {
    usuarios = usuarioRepository,
    categorias = categoriaRepository,
    eventos = eventoRepository,
    compras = compraRepository,
    resenias = resenaRepository,
  } = repositorios;

  // Se hashea una sola vez: todos los usuarios de prueba comparten la contraseña.
  const passwordHash = await hashearPassword(PASSWORD_DE_PRUEBA);
  const usuariosCreados = [];
  for (const [i, { nombre, apellido, email, roles }] of USUARIOS.entries()) {
    const usuario = new Usuario(nombre, apellido, email, passwordHash, roles);
    usuario.id = idFijo("usuario", i + 1);
    usuariosCreados.push(await usuarios.save(usuario));
  }

  const categoriasCreadas = [];
  for (const [i, { nombre, descripcion }] of CATEGORIAS.entries()) {
    const categoria = new Categoria(nombre, descripcion);
    categoria.id = idFijo("categoria", i + 1);
    categoriasCreadas.push(await categorias.save(categoria));
  }

  let numeroDeTipo = 0;
  const eventosCreados = [];
  for (const [i, datos] of EVENTOS.entries()) {
    const tiposEntrada = datos.tipos.map(([nombre, descripcion, precio, cupo]) => {
      const tipo = new TipoEntrada(nombre, descripcion, precio, cupo);
      tipo.id = idFijo("tipoEntrada", ++numeroDeTipo);
      return tipo;
    });
    const evento = new Evento(
      datos.nombre,
      datos.descripcion,
      categoriasCreadas[datos.categoria],
      fechaDeEvento(ahora, datos.dias, datos.hora),
      usuariosCreados[datos.organizador],
      tiposEntrada,
      datos.multimedia,
    );
    evento.id = idFijo("evento", i + 1);
    eventosCreados.push(await eventos.save(evento));
  }

  for (const { comprador, eventos: posiciones } of FAVORITOS) {
    const usuario = usuariosCreados[comprador];
    posiciones.forEach((posicion) => usuario.agregarFavorito(eventosCreados[posicion]));
    await usuarios.save(usuario);
  }

  for (const datos of COMPRAS_CON_RESENIA) {
    const evento = eventosCreados[datos.evento];
    const comprador = usuariosCreados[datos.comprador];
    // Se compró diez días antes del evento, se pagó el mismo día y se usó en la fecha del evento.
    const fechaDeCompra = sumarDias(evento.fecha, -10);
    const compra = new Compra(comprador, evento, evento.tiposEntrada[datos.tipo], datos.cantidad, fechaDeCompra);
    compra.actualizarEstado(estadoCompra.CONFIRMADA, comprador, fechaDeCompra);
    compra.actualizarEstado(estadoCompra.UTILIZADA, evento.organizador, evento.fecha);
    await compras.save(compra);

    const resenia = new Resenia(compra, comprador, datos.puntuacion, datos.detalle, sumarDias(evento.fecha, 1));
    await resenias.save(resenia);
  }

  for (const datos of COMPRAS_PROXIMAS) {
    const evento = eventosCreados[datos.evento];
    const comprador = usuariosCreados[datos.comprador];
    const fechaDeCompra = sumarDias(ahora, -datos.diasAtras);
    const compra = new Compra(comprador, evento, evento.tiposEntrada[datos.tipo], datos.cantidad, fechaDeCompra);

    if (datos.estado !== estadoCompra.PENDIENTE && datos.estado !== estadoCompra.CANCELADA) {
      compra.actualizarEstado(estadoCompra.CONFIRMADA, comprador, fechaDeCompra);
    }
    if (datos.vencida) {
      // La canceló el vencimiento automático en el momento en que venció el plazo.
      compra.vencer(compra.fechaLimiteDePago());
    } else if (datos.estado === estadoCompra.CANCELADA || datos.estado === estadoCompra.REEMBOLSADA) {
      // Cancelar una compra confirmada la reembolsa enseguida; una pendiente solo queda cancelada.
      compra.cancelar(comprador, sumarDias(fechaDeCompra, 1));
    }
    for (const [quien, horas, texto] of datos.mensajes ?? []) {
      const autor = quien === "comprador" ? comprador : evento.organizador;
      compra.agregarMensaje(autor, texto, new Date(fechaDeCompra.getTime() + horas * MS_POR_HORA));
    }
    await compras.save(compra);
  }
}
