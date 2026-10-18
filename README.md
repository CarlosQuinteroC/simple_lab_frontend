# SimpleLab Frontend

Frontend web para el sistema de operaciones de laboratorio SimpleLab. Construido con Next.js (App Router, Turbopack, React 19, TypeScript) y Tailwind CSS.

## Requisitos previos

- Node.js 20+ o superior
- Instancia activa de la API backend de SimpleLab (por defecto en `http://localhost:5084`)
- Instancia de Supabase con autenticación configurada

## Configuración del entorno

Copie el archivo `.env.example` a `.env.local` y configure las variables de entorno necesarias:

```bash
cp .env.example .env.local
```

Variables disponibles:

- `NEXT_PUBLIC_API_BASE_URL`: URL base de la API backend (ejemplo: `http://localhost:5084`).
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto de Supabase (ejemplo: `https://<tu-proyecto>.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima pública de Supabase.

> **Nota sobre CORS**: El backend de SimpleLab restringe los orígenes permitidos mediante la configuración `Cors__AllowedOrigins`. Asegúrese de que `http://localhost:3000` esté incluido en la configuración del backend si ejecuta el frontend en el puerto local por defecto.

## Ejecución local (sin Docker)

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Verificación y Tests

El proyecto cuenta con pruebas de integración y flujos de usuario automatizados usando Playwright (interceptando las llamadas a Supabase y la API para validar flujos de forma reproducible):

```bash
# Ejecutar suite de pruebas de extremo a extremo
npm test

# Ejecutar linter
npm run lint

# Compilar para producción
npm run build
```

## Estructura de Navegación y Características

- **Inicio** (`/`): Panel principal de acceso rápido a operaciones.
- **Tareas** (`/tasks`):
  - Autenticación con Supabase Auth (correo y contraseña).
  - Consulta automática de la primera página de tareas (`GET /api/tasks?page=1&pageSize=20`) enviando el encabezado `Authorization: Bearer <token>`.
  - Estados traducidos al español: *Pendiente*, *En curso* y *Completada*.
  - Manejo diferenciado de estados: cargando, listado vacío, error de conexión con reintento, y expiración de sesión con redirección a login.
  - Cierre de sesión seguro y prevención de persistencia de datos entre usuarios.
  - Interfaz accesible por teclado y adaptable a dispositivos móviles.
- **Estado del sistema** (`/system`): Diagnóstico y disponibilidad de servicios (Ticket 06).
