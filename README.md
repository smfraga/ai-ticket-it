# AI Ticket It

Plataforma de venta de entradas para eventos. Trabajo práctico individual de la materia **Desarrollo de Software (DDS)**, carrera **Ingeniería en Sistemas de Información**, **UTN FRBA**.

## 📦 Estructura del Proyecto

El repositorio tiene dos paquetes independientes, cada uno con su propio `package.json`:

```
.
├── backend/            # API REST con Node.js + Express
│   ├── app.js          # Configuración de la app Express (sin levantar el servidor)
│   ├── server.js       # Punto de entrada: carga el seed y levanta el servidor HTTP
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
│   ├── App.js          # Componente raíz
│   ├── index.js        # Registro de la app en Expo
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

Para tests se usan **`jest`** y **`supertest`** (requests HTTP sobre la app, sin levantar el servidor). Para desarrollo, **`nodemon`** reinicia el servidor al guardar cambios.

La persistencia es **en memoria** (arrays y `Map`): los datos se pierden cuando se reinicia el servidor.

### Frontend (`frontend/`)

App móvil con **React Native** y **Expo**. Se prueba en el celular con **Expo Go**, sin necesidad de Android Studio ni Xcode.

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
| `GET /eventos`      | Busca eventos con los filtros de abajo. Por defecto, solo los próximos                                        |
| `GET /eventos/:id`  | Detalle de un evento (también de los ya realizados), con sus tipos de entrada y lugares disponibles           |
| `POST /eventos`     | Crea un evento con sus tipos de entrada (`201`). Sin token: `401`. Sin rol de organizador: `403`              |
| `GET /categorias`   | Lista las categorías, ordenadas por nombre                                                                    |

Parámetros de `GET /eventos` (todos opcionales):

| Parámetro      | Valores                                        | Descripción                                                                                                  |
|----------------|------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| `texto`        | hasta 100 caracteres                           | Busca en el nombre y la descripción, sin distinguir mayúsculas ni tildes. Varias palabras: tienen que estar todas |
| `categoriaId`  | id de una categoría                            | Solo los eventos de esa categoría                                                                            |
| `precioMin`, `precioMax` | números                              | Eventos con al menos una entrada dentro del rango                                                            |
| `periodo`      | `proximos` (por defecto), `pasados`, `todos`   | Qué eventos mostrar según su fecha                                                                           |
| `orden`        | `fecha` (por defecto), `precio`, `puntaje`     | `precio` usa la entrada más barata del evento; `puntaje` es el promedio de reseñas del organizador            |
| `direccion`    | `asc`, `desc`                                  | Por defecto `asc`, salvo `puntaje` que es `desc`. Los organizadores sin reseñas quedan al final               |

#### Compras

Todas piden token. Comprar exige el rol de comprador; ver las compras de un evento o marcarlas como utilizadas, ser su organizador; cancelar, ser el comprador de esa compra. Estados: `PENDIENTE`, `CONFIRMADA`, `UTILIZADA`, `CANCELADA` y `REEMBOLSADA`.

| Método y ruta                | Descripción                                                                                                                       |
|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| `POST /eventos/:id/compras`  | Compra entradas. Body: `{ "tipoEntradaId": "<id>", "cantidad": 2 }`. La compra nace `PENDIENTE` y se confirma en el mismo request (pago simulado): `201` con estado `CONFIRMADA`. `400` datos inválidos, `403` sin rol de comprador, `404` evento o tipo inexistente, `409` evento ya realizado o cantidad mayor al cupo |
| `GET /compras`               | Las compras del usuario logueado, las más recientes primero, con su estado y los `diasRestantes` (solo si está `CONFIRMADA`, si no `null`) |
| `GET /eventos/:id/compras`   | Las compras de un evento con su estado y comprador (nombre y apellido), y el cupo restante de cada tipo de entrada. Solo el organizador del evento: otro usuario recibe `403` |
| `POST /compras/:id/cancelar` | El comprador cancela su compra (`200` con la compra actualizada). Una `PENDIENTE` queda `CANCELADA`; una `CONFIRMADA` queda `REEMBOLSADA` (reembolso simulado). En los dos casos las entradas vuelven al cupo. `403` si no es el comprador, `404` compra inexistente, `409` si está `UTILIZADA`, ya cancelada o el evento ya se realizó |
| `POST /compras/:id/utilizar` | El organizador del evento marca la compra como `UTILIZADA` (`200`), por ejemplo al dejar entrar al comprador. Solo desde `CONFIRMADA`: `409` en cualquier otro estado. `403` si no es el organizador de ese evento, `404` compra inexistente |

```bash


#### Datos iniciales (seed)

Cada vez que arranca el servidor se cargan datos de prueba en memoria. Los usuarios, las categorías y los eventos del seed tienen **ids fijos**: si el servidor se reinicia (por ejemplo, con `npm run dev`), los tokens que ya se emitieron para esos usuarios siguen valiendo. En cambio, lo que se crea después (usuarios registrados, eventos nuevos) se pierde al reiniciar, y el token de un usuario que ya no existe da `401`.

Usuarios (todos con la contraseña **`Demo1234!`**):

| Email                 | Roles       |
|-----------------------|-------------|
| `olivia@example.com`  | Organizador |
| `octavio@example.com` | Organizador |
| `carla@example.com`   | Comprador   |
| `camilo@example.com`  | Comprador   |

Además se cargan 5 categorías (Recitales, Teatro, Festivales, Conferencias y Deportes) y 8 eventos: 5 próximos y 3 ya realizados. Los realizados tienen compras utilizadas con reseñas, de modo que Olivia tiene un puntaje de 4.5 y Octavio de 2.5, y el orden por puntaje se puede ver con datos reales. Los próximos tienen 7 compras de Carla y Camilo en los estados `PENDIENTE`, `CONFIRMADA`, `CANCELADA` y `REEMBOLSADA`.

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

Se abre el servidor de Expo con un código QR. Escanearlo con Expo Go en el celular.

Requisitos para que el celular llegue al backend:

- El celular y la computadora deben estar en la **misma red Wi-Fi**.
- Cuando el frontend consuma la API, la URL base no puede ser `localhost`, porque en el celular `localhost` apunta al propio teléfono. Hay que usar la **IP local de la computadora** (por ejemplo, `http://192.168.0.10:3000`).
