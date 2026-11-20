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
const EVENTOS_PRINCIPALES = [
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

// --- Eventos del catálogo -----------------------------------------------------------------------------------------
// 40 eventos más (32 próximos y 8 ya realizados) para que el catálogo tenga varias páginas. No tienen compras ni
// reseñas: los puntajes, los chats y los mensajes nuevos siguen saliendo de los 8 de arriba. Ninguno se llama
// parecido a "Rock", "Stand Up" o "Congreso", así las búsquedas del guion de prueba siguen encontrando uno solo.

// Las fotos se reutilizan de los 8 eventos de arriba (ya verificadas), según la categoría.
const FOTOS_POR_CATEGORIA = [
  [...EVENTOS_PRINCIPALES[0].multimedia, ...EVENTOS_PRINCIPALES[6].multimedia], // Recitales
  [...EVENTOS_PRINCIPALES[1].multimedia, ...EVENTOS_PRINCIPALES[5].multimedia], // Teatro
  EVENTOS_PRINCIPALES[2].multimedia, // Festivales
  EVENTOS_PRINCIPALES[3].multimedia, // Conferencias
  [...EVENTOS_PRINCIPALES[4].multimedia, ...EVENTOS_PRINCIPALES[7].multimedia], // Deportes
];

const redondear = (precio) => Math.round(precio / 500) * 500;

// Los tipos de entrada de cada categoría, a partir de un precio base: [nombre, descripción, precio, cupo].
const TIPOS_POR_CATEGORIA = [
  (base) => [
    ["General", "Campo, de pie", base, 300],
    ["Platea", "Sector con butacas", redondear(base * 2), 100],
  ],
  (base) => [
    ["Platea", "Butacas numeradas", base, 150],
    ["Pullman", "Primer piso", redondear(base * 0.7), 80],
  ],
  (base) => [
    ["Anticipada", "Precio de lanzamiento", base, 400],
    ["General", "Entrada del día", redondear(base * 1.4), 800],
  ],
  (base) => [
    ["Estudiante", "Con credencial vigente", redondear(base * 0.4), 100],
    ["General", "Incluye certificado", base, 200],
  ],
  (base) => [
    ["General", "Sin ubicación asignada", base, 500],
    ["Platea", "Tribuna techada", redondear(base * 2), 150],
  ],
];

// [nombre, descripción, categoría, organizador, días, hora, precio base]
const EVENTOS_DEL_CATALOGO = [
  ["Noche de Tango en San Telmo", "Orquesta típica y bailarines en un salón histórico.", 0, 0, 3, "21:00", 7000],
  ["Orquesta Sinfónica: Beethoven", "La Quinta y la Novena en una sola noche.", 0, 1, 14, "20:00", 9000],
  ["Cumbia en el Club Atlético", "Las bandas del momento en el gimnasio del club.", 0, 1, 22, "22:00", 5000],
  ["Trap y Freestyle en vivo", "Batallas de improvisación y artistas invitados.", 0, 0, 27, "21:30", 8000],
  ["Coro Gospel de Navidad", "Voces y palmas para despedir el año.", 0, 0, 33, "19:30", 4500],
  ["Electrónica al Atardecer", "DJ sets frente al río, de la tarde a la noche.", 0, 1, 40, "18:00", 12000],
  ["Piano a la Luz de las Velas", "Clásicos del cine y del pop en piano solo.", 0, 0, 8, "20:30", 10000],
  ["Ciclo de Cantautores", "Cuatro voces, cuatro guitarras y canciones propias.", 0, 1, -5, "21:00", 3500],
  ["Comedia: Los Vecinos de Arriba", "Una comedia de enredos en un edificio de Caballito.", 1, 1, 6, "20:30", 6500],
  ["Musical: Sueños de Broadway", "Los grandes números del teatro musical.", 1, 0, 16, "20:00", 15000],
  ["Impro Teatral: Sin Libreto", "El público elige las historias y el elenco las inventa.", 1, 1, 11, "22:00", 4000],
  ["Títeres para Chicos", "Un cuento con títeres de guante y canciones.", 1, 0, 4, "16:00", 2500],
  ["Monólogos de Medianoche", "Humor para trasnochar, con micrófono abierto al final.", 1, 1, 25, "23:30", 5500],
  ["Ballet: El Lago de los Cisnes", "La compañía estable en una función de gala.", 1, 0, 36, "19:00", 18000],
  ["Drama: La Casa de Bernarda Alba", "El clásico de Lorca con un elenco joven.", 1, 0, -8, "20:00", 6000],
  ["Magia y Ilusionismo", "Una hora de trucos de cerca y grandes ilusiones.", 1, 1, -18, "18:30", 5000],
  ["Festival de Cerveza Artesanal", "Más de 30 cervecerías, música y comida.", 2, 1, 10, "14:00", 3000],
  ["Feria de Comida Callejera", "Puestos de todo el mundo en una sola plaza.", 2, 0, 13, "12:00", 2000],
  ["Festival de Cine Independiente", "Cortos y largos de directores nuevos.", 2, 1, 19, "18:00", 4000],
  ["Festival de Folk y Bluegrass", "Banjos, violines y bandas de todo el país.", 2, 0, 29, "16:00", 6000],
  ["Feria del Libro Barrial", "Editoriales chicas, firmas y charlas con autores.", 2, 1, 7, "11:00", 1500],
  ["Festival de Primavera", "Dos escenarios, feria y actividades para chicos.", 2, 0, 45, "15:00", 9500],
  ["Festival de Murgas", "Las murgas del barrio en un corso de verano.", 2, 1, -15, "17:00", 2000],
  ["Charla: Inteligencia Artificial en la Salud", "Casos reales de diagnóstico asistido.", 3, 1, 12, "18:30", 5000],
  ["Jornada de Emprendedores", "Charlas, rondas de negocios y networking.", 3, 0, 17, "09:30", 8000],
  ["Taller de Fotografía Urbana", "Teoría por la mañana y salida a la calle.", 3, 0, 5, "10:00", 12000],
  ["Encuentro de Diseño UX", "Investigación con usuarios y prototipos.", 3, 1, 23, "09:00", 10000],
  ["Seminario de Finanzas Personales", "Presupuesto, ahorro e inversiones para empezar.", 3, 0, 31, "19:00", 6000],
  ["Hackatón Universitaria", "48 horas para resolver un desafío en equipo.", 3, 1, 38, "09:00", 2500],
  ["Charla: Astronomía para Todos", "Planetas, estrellas y observación con telescopios.", 3, 0, -3, "20:00", 3000],
  ["Jornada de Ciberseguridad", "Ataques comunes y cómo defenderse.", 3, 1, -22, "09:00", 7000],
  ["Torneo de Básquet 3x3", "Equipos mixtos en la cancha del parque.", 4, 1, 2, "16:00", 2000],
  ["Carrera Nocturna 5K", "Circuito iluminado por la costanera.", 4, 0, 15, "20:00", 3500],
  ["Final de Vóley Playero", "Las mejores parejas del verano.", 4, 1, 18, "17:30", 4500],
  ["Exhibición de Patín Artístico", "Coreografías de los clubes de la ciudad.", 4, 0, 24, "18:00", 3000],
  ["Duatlón del Parque", "Correr, pedalear y volver a correr.", 4, 0, 34, "08:00", 6500],
  ["Copa de Fútbol Femenino", "Cuartos de final del torneo de la liga.", 4, 1, 42, "15:00", 2500],
  ["Torneo de Ajedrez Abierto", "Partidas rápidas con premios por categoría.", 4, 1, 26, "10:00", 1500],
  ["Travesía de Natación", "Dos kilómetros en aguas abiertas.", 4, 0, -30, "09:00", 5500],
  ["Partido de Rugby Juvenil", "Los equipos sub 18 del torneo regional.", 4, 1, -9, "15:30", 3000],
];

// Todos los eventos del seed: los 8 de arriba conservan sus posiciones (las usan las compras, las reseñas y los
// favoritos) y después vienen los del catálogo. Uno de cada tres tiene dos fotos, para ver el "1/2" en la tarjeta.
const EVENTOS = [
  ...EVENTOS_PRINCIPALES,
  ...EVENTOS_DEL_CATALOGO.map(([nombre, descripcion, categoria, organizador, dias, hora, precio], i) => {
    const fotos = FOTOS_POR_CATEGORIA[categoria];
    const primera = fotos[i % fotos.length];
    const segunda = fotos[(i + 1) % fotos.length];
    const multimedia = i % 3 === 0 && segunda !== primera ? [primera, segunda] : [primera];
    return {
      nombre,
      descripcion,
      categoria,
      organizador,
      dias,
      hora,
      multimedia,
      tipos: TIPOS_POR_CATEGORIA[categoria](precio),
    };
  }),
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
