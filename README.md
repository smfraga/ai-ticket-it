# AI Ticket It

Plataforma de venta de entradas para eventos. Trabajo práctico individual de la materia **Desarrollo de Software (DDS)**, carrera **Ingeniería en Sistemas de Información**, **UTN FRBA**.

## 📦 Estructura del Proyecto

El repositorio tiene dos paquetes independientes, cada uno con su propio `package.json`:

```
.
├── backend/            # API REST con Node.js + Express
│   ├── app.js          # Configuración de la app Express (sin levantar el servidor)
│   ├── server.js       # Punto de entrada: levanta el servidor HTTP
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

Variable de entorno disponible:

| Variable | Ejemplo | Descripción                                        |
|----------|---------|----------------------------------------------------|
| `PORT`   | `3000`  | Puerto del servidor (opcional, por defecto `3000`) |

Por ahora el servidor la lee desde el entorno de la terminal, no desde un archivo `.env`. Por ejemplo, en Git Bash o Linux: `PORT=3001 npm start`. En PowerShell: `$env:PORT=3001; npm start`.

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
