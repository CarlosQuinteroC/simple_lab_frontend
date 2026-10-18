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
  - **Autenticación con Supabase Auth**: Inicio y cierre de sesión con correo y contraseña, con persistencia y prevención de datos residuales entre cuentas.
  - **Filtros por estado**: Opciones para *Todas*, *Pendientes*, *En curso* y *Completadas*, mapeadas a los parámetros correspondientes (`status=pending`, `status=in_progress`, `status=completed`, o sin filtro para *Todas*). El listado reinicia automáticamente a la página 1 al cambiar de filtro.
  - **Paginación sin totales**: Páginas de 20 elementos (`page` y `pageSize=20`) mediante botones *Anterior* y *Siguiente*. La API backend no entrega un contador total de tareas ni total de páginas, por lo que la interfaz omite contadores inventados.
  - **Manejo de páginas parciales y posteriores vacías**:
    - Si una página recibe menos de 20 elementos, el botón *Siguiente* se deshabilita para indicar el fin del listado.
    - Si una página entrega exactamente 20 elementos, se permite avanzar. Si la página subsiguiente resulta estar vacía, la interfaz lo explica con claridad y proporciona tanto el botón de *Anterior* como la acción directa *Volver a la página anterior*.
  - **Prevención de condiciones de carrera**: Control de solicitudes desincronizadas para que respuestas demoradas no sobreescriban el filtro o página seleccionada activamente.
  - **Manejo de estados**: Carga, listado sin tareas para el filtro seleccionado, y errores con botón de reintento manteniendo la barra de filtros y navegación utilizables.
  - **Accesibilidad y adaptabilidad**: Totalmente navegable mediante teclado (foco visible y accesible) y adaptado a pantallas móviles.
- **Estado del sistema** (`/system`): Diagnóstico y disponibilidad de servicios (Ticket 06).
