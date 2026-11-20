# AI Ticket It

Plataforma de venta de entradas para eventos. Trabajo práctico individual de la materia **Desarrollo de Software (DDS)**, carrera **Ingeniería en Sistemas de Información**, **UTN FRBA**.

## ✨ Funcionalidades

Cada usuario inicia sesión con email y contraseña, y puede ser **comprador**, **organizador** o las dos cosas. La app muestra las pestañas según sus roles.

**Comprador** (pestañas Eventos, Mis compras, Favoritos, Mensajes y Perfil):

- Explorar el catálogo: búsqueda por texto, categorías, rango de precio, eventos próximos o ya realizados y orden por fecha, precio o puntaje del organizador.
- Ver el detalle de un evento, con sus fotos, los lugares que quedan de cada tipo de entrada y las reseñas de los eventos anteriores de su organizador.
- Comprar eligiendo tipo de entrada y cantidad, sin superar el cupo (el pago está simulado: la compra se confirma en el momento).
- Seguir sus compras, con un filtro por estado: estado, días que faltan para el evento y el historial de cada cambio de estado.
- Pagar una compra que quedó pendiente de pago (pago simulado).
- Chatear con el organizador desde cada compra, en cualquier estado.
- Cancelar una compra (con reembolso si estaba confirmada) mientras no esté utilizada y el evento no haya pasado.
- Reseñar con puntaje y comentario una compra ya utilizada.
- Guardar eventos favoritos (♡) y verlos en su pestaña, en una grilla con fotos, los días que faltan y un aviso si quedan pocas entradas.

**Organizador** (pestañas Eventos, Mis eventos, Mensajes y Perfil):

- Crear eventos con uno o más tipos de entrada, cada uno con precio y cupo, y una imagen opcional (URL).
- Editar un evento próximo (datos, fecha y tipos de entrada; si cambia la fecha, cada comprador recibe un aviso en el chat) o cancelarlo (las compras confirmadas se reembolsan y las pendientes se cancelan).
- Ver sus eventos y, de cada uno, las entradas que quedan por tipo y las compras con su estado.
- Marcar una compra como utilizada (cuando el comprador entra al evento).
- Responder el chat de cada compra.

**Los dos** tienen la pestaña **Mensajes**: todos sus chats (uno por compra, cada uno sobre un evento) con el último mensaje y su hora, ordenados como en WhatsApp, y la cantidad de mensajes nuevos sobre el ícono de la pestaña. Dentro del chat, los mensajes se separan por día ("Hoy", "Ayer", el día de la semana o la fecha) y el fondo se puede cambiar (se guarda en el celular).

En la pestaña **Perfil**, cada uno edita su nombre y apellido y ve sus estadísticas y su historial: el comprador, las entradas que compró, cuánto gastó, a cuántos eventos fue, sus reseñas, su categoría preferida, su próximo evento y los eventos a los que fue; el organizador, sus eventos (próximos, realizados y cancelados), las entradas vendidas, la recaudación, su evento más vendido, su puntaje y los eventos que ya hizo.

## 📋 Casos de uso de la consigna

| Caso de uso | Pantalla | Endpoints |
|---|---|---|
| Comprador: ver sus compras con el estado y los días que faltan si está confirmada | Mis compras | `GET /compras` |
| Organizador: ver las compras de un evento con su estado y las entradas que quedan por tipo | Mis eventos → evento | `GET /eventos?organizadorId=`, `GET /eventos/:id/compras` |
| Comprador: buscar eventos por texto o explorarlos por categoría | Eventos | `GET /eventos?texto=&categoriaId=`, `GET /categorias` |
| Organizador: crear un evento con tipos de entrada, cada uno con precio y cupo | Mis eventos → Crear evento | `POST /eventos` |
| Comprador: enviar mensajes sobre una compra en cualquier momento | Detalle de la compra → Chat, o pestaña Mensajes | `GET` y `POST /compras/:id/mensajes`, `GET /conversaciones` |
| Organizador: responder mensajes de una compra en cualquier momento | Compras del evento → compra → Chat, o pestaña Mensajes | `GET` y `POST /compras/:id/mensajes`, `GET /conversaciones` |
| Comprador: cancelar una compra para obtener el reembolso | Detalle de la compra | `POST /compras/:id/cancelar` |
| Cancelar solo si la compra no está utilizada y el evento no se realizó | Detalle de la compra (sin botón, con el motivo) | Regla en `Compra.cancelar` (`409`) |
| Una vez utilizada la entrada, puntuar el evento y dejar un comentario | Detalle de la compra → Dejar reseña | `POST /compras/:id/utilizar` (organizador), `POST /compras/:id/resenia` |
| Ver las reseñas de eventos anteriores de cada organizador antes de comprar | Detalle del evento | `GET /organizadores/:id/resenias` |
| Ordenar eventos por precio, fecha y puntaje del organizador | Eventos → Ordenar por | `GET /eventos?orden=` |
| Comprar eligiendo tipo de entrada y cantidad, sin superar el cupo | Detalle del evento | `POST /eventos/:id/compras` |
| Guardar eventos favoritos (contexto y diagrama de la consigna) | ♡ en el catálogo y el detalle, pestaña Favoritos | `POST` y `DELETE /eventos/:id/favorito`, `GET /favoritos` |

## 📦 Estructura del Proyecto

El repositorio tiene dos paquetes independientes, cada uno con su propio `package.json`:

```
.
├── backend/            # API REST con Node.js + Express
│   ├── app.js          # Configuración de la app Express (sin levantar el servidor)
│   ├── server.js       # Punto de entrada: carga el seed, arranca el vencimiento de pendientes y levanta el servidor HTTP
│   ├── docs/openapi/   # Especificación OpenAPI por módulos (Swagger en /api-docs)
│   ├── routes/         # Rutas → controllers → services → dominio y repositorios
│   ├── controllers/    # Extienden BaseController (validación de ids y de la query)
│   ├── services/
│   ├── domain/         # Entidades y reglas de negocio
│   ├── repositories/   # Persistencia en memoria
│   ├── middlewares/    # Autenticación, validación, límite de intentos, errores
│   ├── validations/    # Esquemas Zod de las requests
│   ├── errors/         # ValidationError, NotFoundError, ConflictError, etc.
│   ├── seeds/          # Datos iniciales
│   ├── test/
│   ├── .env.example    # Ejemplo de variables de entorno
│   └── package.json
├── frontend/           # App móvil con React Native + Expo
│   ├── App.js          # Componente raíz: fuentes, sesión, favoritos, mensajes y navegación
│   ├── index.js        # Registro de la app en Expo
│   ├── src/
│   │   ├── screens/    # Una pantalla por archivo (catálogo, detalle, compras, chat, organizador…)
│   │   ├── components/ # Piezas reutilizables (tarjetas, botones, estado de la compra, selectores)
│   │   ├── navigation/ # Pestañas y pilas de React Navigation según el rol
│   │   ├── services/   # Cliente de la API (fetch con token) y un servicio por recurso
│   │   ├── auth/       # Contextos de sesión (JWT en SecureStore), favoritos y mensajes nuevos
│   │   ├── hooks/      # useUltimoPedido: descarta respuestas viejas
│   │   ├── utils/      # Reglas puras de pantalla (formatos, cupos, validaciones), con tests
│   │   ├── theme/      # Colores, espacios y tipografía
│   │   └── config.js   # URL de la API según la IP del servidor de Expo
│   └── package.json
├── .gitignore
└── README.md
```

## ⚙️ Paquetes

### Backend (`backend/`)

Construido con Express 5. Dependencias principales:

- **`express`**: framework web para construir la API.
- **`cors`**: habilita CORS, necesario para que la app móvil y el navegador puedan llamar a la API desde otro origen.
- **`jsonwebtoken`**: firma y verifica los tokens de sesión (JWT).
- **`bcryptjs`**: guarda las contraseñas como hash, nunca en texto plano.
- **`zod`**: valida el cuerpo de las requests.
- **`dotenv`**: carga las variables de entorno desde el archivo `.env`.
- **`swagger-ui-express`**: sirve la documentación interactiva de la API en `/api-docs`.

Para tests se usan **`jest`** y **`supertest`** (requests HTTP sobre la app, sin levantar el servidor). Para desarrollo, **`nodemon`** reinicia el servidor al guardar cambios.

La persistencia es **en memoria** (arrays y `Map`): los datos se pierden cuando se reinicia el servidor.

### Frontend (`frontend/`)

App móvil con **React Native** y **Expo**. Se prueba en el celular con **Expo Go**, sin necesidad de Android Studio ni Xcode. Dependencias principales:

- **`@react-navigation/*`**: pestañas y pilas de pantallas.
- **`expo-secure-store`**: guarda la sesión (el token JWT) cifrada en el celular.
- **`@react-native-async-storage/async-storage`**: guarda preferencias del celular que no son secretas (el fondo de los chats).
- **`expo-image-picker`** y **`expo-file-system`**: elegir una foto de la galería como fondo del chat (y guardar una copia en la carpeta de la app) o como foto de perfil.
- **`expo-image-manipulator`**: achicar la foto de perfil a 256×256 en JPEG antes de subirla (unos 20 KB).
- **`@react-native-community/datetimepicker`**: selector nativo de fecha y hora para crear eventos.
- **`@expo/vector-icons`**: íconos de las pestañas.
- **`expo-font`**, **`@expo-google-fonts/bebas-neue`** y **`@expo-google-fonts/dm-sans`**: tipografía de la app (títulos con letra de cartel y cuerpo en DM Sans).

Las llamadas a la API usan `fetch` propio (`src/services/api.js`), con el token en `Authorization: Bearer`, timeout de 10 s y cierre de sesión automático si el backend responde `401`. Para tests se usa **`jest-expo`**.

### Calidad de código (raíz del repo)

**ESLint** (reglas recomendadas de JavaScript, de React y de hooks) y **Prettier** (formato) se instalan en la raíz y revisan el backend y el frontend. La configuración está en `eslint.config.mjs` y `.prettierrc.json`.

```bash
npm install            # en la raíz, solo la primera vez
npm run lint           # problemas de código (variables sin usar, hooks mal usados, nombres no definidos…)
npm run format:check   # qué archivos no respetan el formato
npm run format         # los formatea
```

El commit que formateó todo el repo está en `.git-blame-ignore-revs`: con `git config blame.ignoreRevsFile .git-blame-ignore-revs`, `git blame` muestra quién escribió cada línea y no el cambio de formato.

## 🚀 Inicio Rápido

### Requisitos

- Node.js 20 o superior.
- Para el frontend: la app **Expo Go** instalada en el celular.

### 1. Backend

```bash
cd backend
npm install
```

Crear el archivo `.env` a partir del ejemplo. El `.env` no se sube al repositorio.

```bash
cp .env.example .env
```

| Variable         | Ejemplo        | Descripción                                                                              |
|------------------|----------------|------------------------------------------------------------------------------------------|
| `PORT`           | `3000`         | Puerto del servidor (opcional, por defecto `3000`)                                       |
| `JWT_SECRET`     | (cadena larga) | Clave para firmar los tokens de sesión. **Obligatoria**: sin ella el backend no arranca |
| `JWT_EXPIRES_IN` | `1h`           | Duración del token (opcional, por defecto `1h`)                                          |

Para generar un `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Para levantar el servidor:

```bash
npm start        # sin recarga automática
npm run dev      # con recarga automática al guardar cambios
```

Para verificar que responde:

```bash
curl http://localhost:3000/health
```

Debe devolver `{"status":"ok"}`.

#### Documentación interactiva (Swagger)

Con el servidor corriendo, la documentación de todos los endpoints está en **http://localhost:3000/api-docs** (la especificación OpenAPI en JSON, en `/api-docs.json`). Para probar las rutas con candado: ejecutar `POST /auth/login` con un usuario del seed, copiar el `token` y pegarlo en **Authorize**. La especificación está armada por módulos en `backend/docs/openapi/`, y un test comprueba que documente exactamente las rutas del router y cuáles piden token.

#### Autenticación

La API usa tokens JWT. Un usuario puede ser **comprador**, **organizador** o ambos (`roles`). Con el token de la respuesta, las rutas protegidas se llaman con el header `Authorization: Bearer <token>`.

| Método y ruta         | Descripción                                                              |
|-----------------------|--------------------------------------------------------------------------|
| `POST /auth/registro` | Crea un usuario y devuelve la sesión (`201`). Email repetido: `409`      |
| `POST /auth/login`    | Devuelve la sesión (`200`). Credenciales inválidas: `401`                |

Después de 10 logins fallidos desde la misma IP en 15 minutos, el login responde `429` con el header `Retry-After` hasta que pase ese tiempo.

```bash
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" \
  -d '{"email":"carla@example.com","password":"Demo1234!"}'
```

```bash
curl -X POST http://localhost:3000/auth/registro -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","apellido":"Pérez","email":"ana@example.com","password":"una-clave-larga","roles":["COMPRADOR"]}'
```

#### Eventos y categorías

Ver el catálogo es público (no pide token). Crear un evento exige estar logueado y tener el rol de organizador.

| Método y ruta       | Descripción                                                                                                   |
|---------------------|---------------------------------------------------------------------------------------------------------------|
| `GET /eventos`      | Busca eventos con los filtros de abajo, de a una página. Por defecto, solo los próximos. Los cancelados no aparecen, salvo al filtrar por `organizadorId`. Cada evento trae `diasParaElEvento` (días de calendario, `0` si es hoy, `null` si ya se realizó) |
| `GET /eventos/:id`  | Detalle de un evento (también de los ya realizados y los cancelados, con `cancelado: true`), con sus tipos de entrada y lugares disponibles |
| `POST /eventos`     | Crea un evento con sus tipos de entrada (`201`). Sin token: `401`. Sin rol de organizador: `403`              |
| `PATCH /eventos/:id` | Edita un evento próximo (solo su organizador, si no `403`). Cambia solo lo que viene: `nombre`, `descripcion`, `categoriaId`, `fecha` (futura), `multimedia` y `tiposEntrada` (lista completa: con `id` los existentes, sin `id` los nuevos; los que faltan se quitan). Un tipo con entradas vendidas no se quita ni cambia de precio, y su cupo no baja de lo vendido (`409`). Evento ya realizado: `409`. Si cambia la fecha, cada compra pendiente o confirmada recibe un aviso en su chat. Evento cancelado: `409` |
| `POST /eventos/:id/cancelar` | Cancela un evento próximo (solo su organizador, si no `403`; ya realizado o ya cancelado: `409`). Las compras confirmadas quedan `REEMBOLSADA` y las pendientes `CANCELADA`, con el organizador como responsable, y cada una recibe un aviso en su chat. Después no se pueden comprar entradas (`409`) |
| `GET /categorias`   | Lista las categorías, ordenadas por nombre                                                                    |

Parámetros de `GET /eventos` (todos opcionales):

| Parámetro      | Valores                                        | Descripción                                                                                                  |
|----------------|------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| `texto`        | hasta 100 caracteres                           | Busca en el nombre y la descripción, sin distinguir mayúsculas ni tildes. Varias palabras: tienen que estar todas |
| `categoriaId`  | id de una categoría                            | Solo los eventos de esa categoría                                                                            |
| `organizadorId` | id de un usuario                              | Solo los eventos de ese organizador (la app lo usa con `periodo=todos` para "Mis eventos")                   |
| `precioMin`, `precioMax` | números                              | Eventos con al menos una entrada dentro del rango                                                            |
| `periodo`      | `proximos` (por defecto), `pasados`, `todos`   | Qué eventos mostrar según su fecha                                                                           |
| `orden`        | `fecha` (por defecto), `precio`, `puntaje`     | `precio` usa la entrada más barata del evento; `puntaje` es el promedio de reseñas del organizador            |
| `direccion`    | `asc`, `desc`                                  | Por defecto `asc`, salvo `puntaje` que es `desc`. Los organizadores sin reseñas quedan al final               |
| `page`         | 1 o más (por defecto `1`)                      | Qué página, después de filtrar y ordenar                                                                     |
| `limit`        | de 1 a 100 (por defecto `20`)                  | Eventos por página (la app pide de a 10, con scroll infinito)                                                |

La respuesta es paginada, como los listados del TP grupal: `{ "eventos": [...], "total": 37, "page": 1, "totalPages": 2 }`, donde `total` es cuántos eventos cumplen los filtros en todas las páginas.

#### Compras

Todas piden token. Comprar exige el rol de comprador; ver las compras de un evento o marcarlas como utilizadas, ser su organizador; cancelar, ser el comprador de esa compra; leer y escribir en el chat, ser el comprador o el organizador de esa compra. Estados: `PENDIENTE`, `CONFIRMADA`, `UTILIZADA`, `CANCELADA` y `REEMBOLSADA`.

| Método y ruta                | Descripción                                                                                                                       |
|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| `POST /eventos/:id/compras`  | Compra entradas. Body: `{ "tipoEntradaId": "<id>", "cantidad": 2 }`. La compra nace `PENDIENTE` y se confirma en el mismo request (pago simulado): `201` con estado `CONFIRMADA`. `400` datos inválidos, `403` sin rol de comprador, `404` evento o tipo inexistente, `409` evento ya realizado o cantidad mayor al cupo |
| `GET /compras`               | Las compras del usuario logueado, las más recientes primero, con su estado y los `diasRestantes` (solo si está `CONFIRMADA`, si no `null`) |
| `GET /compras/:id`           | El detalle de una compra: lo mismo que la lista (estado, `diasRestantes`, `historial` con cada cambio de estado) más el `comprador` (nombre y apellido), el organizador y `yaPaso` dentro de `evento`, y la `resenia` de la compra (o `null` si todavía no tiene). Solo el comprador y el organizador del evento: otro usuario recibe `403`. `400` si el id no es un UUID, `401` sin token, `404` si no existe |
| `GET /eventos/:id/compras`   | Las compras de un evento con su estado y comprador (nombre y apellido), y el cupo restante de cada tipo de entrada. Solo el organizador del evento: otro usuario recibe `403` |
| `POST /compras/:id/cancelar` | El comprador cancela su compra (`200` con la compra actualizada). Una `PENDIENTE` queda `CANCELADA`; una `CONFIRMADA` queda `REEMBOLSADA` (reembolso simulado). En los dos casos las entradas vuelven al cupo. `403` si no es el comprador, `404` compra inexistente, `409` si está `UTILIZADA`, ya cancelada o el evento ya se realizó |
| `POST /compras/:id/pagar`    | El comprador paga una compra `PENDIENTE` y queda `CONFIRMADA` (`200`, pago simulado). Las compras nuevas ya se confirman al comprar; esto sirve para las que quedaron pendientes. `403` si no es el comprador, `404` compra inexistente, `409` si no está `PENDIENTE`, si el evento ya se realizó o si venció el plazo de pago |
| `POST /compras/:id/utilizar` | El organizador del evento marca la compra como `UTILIZADA` (`200`), por ejemplo al dejar entrar al comprador. Solo desde `CONFIRMADA`: `409` en cualquier otro estado. `403` si no es el organizador de ese evento, `404` compra inexistente |
| `GET /compras/:id/mensajes`  | El chat de la compra, del más viejo al más nuevo. Cada mensaje trae `autor` (`id`, `nombre`, `apellido` y su `rol` en esa compra: `COMPRADOR` u `ORGANIZADOR`), `mensaje` y `enviado`. Solo el comprador y el organizador del evento: otro usuario recibe `403` |
| `POST /compras/:id/mensajes` | Escribe en el chat. Body: `{ "mensaje": "texto" }`, de 1 a 500 caracteres (se recortan los espacios de los bordes). `201` con el mensaje. `400` texto vacío o demasiado largo, `403` si no participa, `404` compra inexistente. Se puede escribir en cualquier estado de la compra |
| `GET /conversaciones`        | Los chats del usuario, como comprador o como organizador: uno por compra con al menos un mensaje, el del último mensaje más reciente primero. Cada uno trae `compraId`, el `evento` (con su primera `imagen` o `null`), `tipoEntrada`, `cantidad`, la `contraparte` (nombre, apellido y rol en esa compra), el `ultimoMensaje` (`texto`, `enviado` y si es `propio`) y sus `noLeidos`; además, `totalNoLeidos` (el número de la pestaña Mensajes de la app). Ver la lista no marca nada como leído |

**Mensajes no leídos.** Cada compra guarda cuándo leyó el chat cada participante: leerlo (`GET /compras/:id/mensajes`) o escribir en él cuenta como leído. Las respuestas de compras (`GET /compras`, `GET /compras/:id`, `GET /eventos/:id/compras` y las acciones) traen `mensajesNoLeidos`: los mensajes de la otra parte posteriores a la última lectura de quien pide. En el seed, Carla tiene 1 sin leer (la respuesta de hoy de Olivia en el recital de rock) y Octavio 2 (las consultas de Camilo en el stand up y de Carla en el congreso). Los mensajes del recital van de hace 6 días a hoy y la consulta del congreso es de hace 10, para ver en la app todos los separadores de fecha del chat.

**Vencimiento de compras pendientes.** Una compra `PENDIENTE` se puede pagar durante 7 días desde que se hizo, o hasta que empieza el evento si es antes. Las respuestas de compras traen `fechaLimiteDePago` (`null` si no está pendiente). Al arrancar y después cada minuto, el servidor cancela las vencidas: quedan `CANCELADA`, liberan el cupo y en el seguimiento figura "AI Ticket It" como responsable.

#### Reseñas

Reseñar exige token; ver las reseñas es público, como el catálogo. Solo se puede reseñar una compra `UTILIZADA`, una sola vez por compra y la reseña la hace su comprador.

| Método y ruta                    | Descripción                                                                                                                                                      |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `POST /compras/:id/resenia`      | Body: `{ "puntuacion": 5, "detalle": "comentario" }`, con puntuación entera de 1 a 5 y comentario obligatorio (sin límite de largo). `201` con la reseña. `400` datos inválidos, `401` sin token, `403` si no es el comprador de esa compra, `404` compra inexistente, `409` si la compra no está `UTILIZADA` o ya tiene una reseña |
| `GET /eventos/:id/resenias`      | Las reseñas del evento, las más recientes primero, junto con el organizador y su puntaje. `404` si el evento no existe                                            |
| `GET /organizadores/:id/resenias`| El organizador con su `puntaje` (promedio de las reseñas de todos sus eventos, con 1 decimal, o `null` si no tiene), su `cantidadResenias` y sus reseñas. `404` si el usuario no existe o no es organizador |

Para probarlo con el seed: comprar un evento como comprador, marcar la compra con `POST /compras/:id/utilizar` como organizador de ese evento y reseñarla como comprador. El puntaje del organizador cambia en el momento.

#### Favoritos

Los compradores pueden guardar eventos para encontrarlos después. Las tres rutas piden token y rol de comprador (un usuario que es solo organizador recibe `403`). Guardar y quitar no dan error si ya estaba o no estaba guardado, así un doble toque no rompe nada.

| Método y ruta                  | Descripción                                                                                                                                   |
|--------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| `POST /eventos/:id/favorito`   | Guarda el evento como favorito. `201` con el evento la primera vez y `200` si ya lo era. `404` si el evento no existe. Se pueden guardar eventos ya realizados |
| `DELETE /eventos/:id/favorito` | Quita el evento de los favoritos. `204` sin cuerpo, haya estado guardado o no. `404` si el evento no existe                                    |
| `GET /favoritos`               | La lista del comprador, con el último guardado primero, en el mismo formato que `GET /eventos` (incluye `yaPaso`, `diasParaElEvento`, el puntaje del organizador y los lugares disponibles) |

El catálogo es público y no sabe quién lo mira, así que no marca cuáles son favoritos: para pintar el corazón en una pantalla, se compara el id de cada evento con los de `GET /favoritos`. En el seed, Carla tiene guardados el recital de rock y el festival de jazz, y Camilo el stand up.

#### Perfil

Los datos del usuario logueado (el del token), que piden token, y la foto de perfil de cualquier usuario, que es pública. Las respuestas con un usuario (la sesión, el perfil, la `contraparte` de `GET /conversaciones`, el `autor` de cada mensaje y de cada reseña, el `organizador` de los eventos y de las reseñas, y el `comprador` en `GET /compras/:id` y en `GET /eventos/:id/compras`) traen `foto` con la ruta de su foto, o `null`.

| Método y ruta  | Descripción                                                                                                                                                   |
|----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `GET /perfil`   | Los datos del usuario y, según sus roles, `comprador` y `organizador` (o `null` si no tiene ese rol), cada uno con `estadisticas` e `historial`. Comprador: entradas compradas, total gastado, eventos a los que fue, reseñas dejadas, categoría preferida y próximo evento; historial con los eventos a los que fue (compras `UTILIZADA`). Organizador: eventos creados (próximos, realizados, cancelados), entradas vendidas, recaudación, evento más vendido, puntaje y cantidad de reseñas; historial con sus eventos realizados y lo vendido en cada uno. Una entrada cuenta si la compra está `CONFIRMADA` o `UTILIZADA` |
| `PATCH /perfil` | Cambia `nombre` y/o `apellido` (al menos uno, de 1 a 60 caracteres, sin los espacios de los bordes) y devuelve el usuario como en la sesión. El email y los roles no se editan (`400` si vienen). El token sigue sirviendo: solo lleva el id y los roles |
| `PUT /perfil/foto` | Cambia la foto de perfil. Body: `{ "imagen": "data:image/jpeg;base64,..." }` (JPEG o PNG; la app la achica a 256×256). El tipo se verifica por los primeros bytes y la imagen puede pesar hasta 64 KB (`400` si no). Un body de más de 100 KB lo corta `express.json()` con `413`. Devuelve el usuario con `foto`: la ruta con su versión (`/usuarios/:id/foto?v=2`), que cambia con cada foto nueva |
| `DELETE /perfil/foto` | Quita la foto (vuelven las iniciales); sin foto no es un error. Devuelve el usuario con `foto: null` |
| `GET /usuarios/:id/foto` | **Pública.** La imagen (no JSON), con caché de un día. `404` si el usuario no existe o no tiene foto |

#### Registro de errores

Cada error que llega al manejador global se escribe en la consola del servidor: los inesperados (`500`) con el stack y los del cliente (`4xx`) en una sola línea con el método, la ruta, el status y el mensaje. Nunca se registra el cuerpo de la request ni los headers, porque pueden traer contraseñas y tokens. En los tests el registro está silenciado.

#### Datos iniciales (seed)

Cada vez que arranca el servidor se cargan datos de prueba en memoria. Los usuarios, las categorías y los eventos del seed tienen **ids fijos**: si el servidor se reinicia (por ejemplo, con `npm run dev`), los tokens que ya se emitieron para esos usuarios siguen valiendo. En cambio, lo que se crea después (usuarios registrados, eventos nuevos) se pierde al reiniciar, y el token de un usuario que ya no existe da `401`.

Usuarios (todos con la contraseña **`Demo1234!`**):

| Email                 | Roles       |
|-----------------------|-------------|
| `olivia@example.com`  | Organizador |
| `octavio@example.com` | Organizador |
| `carla@example.com`   | Comprador   |
| `camilo@example.com`  | Comprador   |

Además se cargan 5 categorías (Recitales, Teatro, Festivales, Conferencias y Deportes) y 48 eventos: 37 próximos y 11 ya realizados. Los 8 primeros (5 próximos y 3 realizados) tienen toda la historia que sigue; los otros 40 están para que el catálogo tenga varias páginas y no tienen compras ni reseñas. Los realizados tienen compras utilizadas con reseñas, de modo que Olivia tiene un puntaje de 4.5 y Octavio de 2.5, y el orden por puntaje se puede ver con datos reales. Los próximos tienen 8 compras de Carla y Camilo en los estados `PENDIENTE`, `CONFIRMADA`, `CANCELADA` y `REEMBOLSADA` (una de las canceladas, la de Carla en el congreso, la canceló la plataforma porque venció su plazo de pago), y tres de ellas tienen chat: la compra de Carla en el recital de rock (6 mensajes con Olivia), la `PENDIENTE` de Camilo en el stand up (1 mensaje) y la compra vencida de Carla en el congreso (1 mensaje).

Para correr los tests:

```bash
npm test
```

Como el backend usa módulos ES (`"type": "module"`), Jest se ejecuta con `node --experimental-vm-modules`, que ya viene en el script `test`. Conviene usar `npm test` y no llamar a `jest` directamente, porque falla con `Cannot use import statement outside a module`.

### 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm start
```

Se abre el servidor de Expo con un código QR. Escanearlo con Expo Go en el celular (en iPhone, con la cámara). Hace falta una cuenta gratuita de Expo, con sesión iniciada en la terminal (`npx expo login`) y en la app Expo Go.

Requisitos para que el celular llegue al backend:

- El celular y la computadora deben estar en la **misma red Wi-Fi**.
- En el celular `localhost` apunta al propio teléfono, así que la app no usa `localhost`: toma la **IP de la computadora** del servidor de Expo y le agrega el puerto `3000` (ver `frontend/src/config.js`). El backend tiene que escuchar en el puerto 3000.
- Si la computadora tiene varias redes (por ejemplo, VirtualBox o una VPN) y Expo anuncia una IP equivocada, se fuerza con `REACT_NATIVE_PACKAGER_HOSTNAME=<ip>` al correr `npm start` (en PowerShell: `$env:REACT_NATIVE_PACKAGER_HOSTNAME="<ip>"; npm start`).
- Para apuntar a otra URL de la API, definir `EXPO_PUBLIC_API_URL` en `frontend/.env.local` (por ejemplo, `EXPO_PUBLIC_API_URL=http://192.168.0.10:3000`). Ese archivo no se sube al repositorio.
- **Firewall de Windows:** si la red está como Pública, bloquea las conexiones entrantes. Hay que abrir los puertos 3000 (API) y 8081 (Expo), en PowerShell como administrador:

  ```powershell
  New-NetFirewallRule -DisplayName "AI Ticket It API" -Direction Inbound -Protocol TCP -LocalPort 3000,8081 -Action Allow -Profile Public
  ```

  Para comprobarlo, abrir `http://<ip-de-la-pc>:3000/health` en el navegador del celular: tiene que mostrar `{"status":"ok"}`.
- En iPhone, Expo Go necesita el permiso de **Red local** (Ajustes → Expo Go).

Para entrar, usar uno de los usuarios del seed (por ejemplo `carla@example.com` como comprador u `octavio@example.com` como organizador, con contraseña `Demo1234!`) o crear una cuenta nueva.

Para correr los tests del frontend (configuración, cliente de la API, sesión y las reglas puras de `src/utils/`: formatos, estados y cancelación de compras, cupos, chat, reseñas, favoritos y validación del formulario de eventos). Las pantallas se prueban en el celular:

```bash
cd frontend
npm test
```
