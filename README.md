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
│   ├── controllers/
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

#### Datos iniciales (seed)

Cada vez que arranca el servidor se cargan datos de prueba en memoria. Por ahora, los usuarios (todos con la contraseña **`Demo1234!`**):

| Email                 | Roles       |
|-----------------------|-------------|
| `olivia@example.com`  | Organizador |
| `octavio@example.com` | Organizador |
| `carla@example.com`   | Comprador   |
| `camilo@example.com`  | Comprador   |

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
