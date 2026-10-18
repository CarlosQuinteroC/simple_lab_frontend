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

### Comprobación contra la API real e impedimentos

- La integración del frontend está preparada para comunicarse directamente con la API backend en `http://localhost:5084`.
- **Impedimento registrado en el entorno local**: La instancia real del backend no se encuentra en ejecución en el puerto `5084` (`curl: Failed to connect to localhost port 5084`).
- Para garantizar la cobertura estricta de los criterios de aceptación sin depender de servicios externos en desarrollo local, la verificación de creación, edición, eliminación, filtrado, paginación, traducciones, control de errores y ciclo de autenticación se valida de extremo a extremo mediante la suite de Playwright (`npm test`), reproduciendo con precisión el contrato de la API y de Supabase Auth.

## Estructura de Navegación y Características

- **Inicio** (`/`): Panel principal de acceso rápido a operaciones.
- **Tareas** (`/tasks`):
  - **Autenticación con Supabase Auth**: Inicio y cierre de sesión con correo y contraseña, con persistencia y prevención de datos residuales entre cuentas.
  - **Creación de tareas**: Formulario modal accesible ("Nueva tarea") que solicita únicamente el título, sin exigir estado ni propietario. Valida título obligatorio, rechaza textos compuestos exclusivamente de espacios y restringe la longitud a 200 caracteres. El backend asigna de forma predeterminada el estado *Pendiente*.
  - **Edición de título y estado**: Formulario modal accesible ("Editar tarea") disponible desde cada fila del listado. Precarga el título y estado actuales, permitiendo cambiar libremente entre *Pendiente* (`pending`), *En curso* (`in_progress`) y *Completada* (`completed`). Envía `PUT /api/tasks/{id}` con `{ title, status }` y el Bearer token del usuario.
  - **Eliminación consciente con confirmación**: Diálogo modal accesible ("Eliminar tarea") que identifica explícitamente el título de la tarea antes de proceder. Cancelar (mediante botón o tecla `Escape`) no emite peticiones ni altera el listado. Al confirmar, emite `DELETE /api/tasks/{id}` con Bearer token e interpreta 204 No Content como éxito sin intentar leer JSON.
  - **Control de envíos y conservación de datos**: Deshabilita los controles e indica estados de carga ("Guardando...", "Eliminando...") durante el procesamiento para evitar solicitudes duplicadas. Ante un fallo de red, servidor (500) o recurso no disponible (404), conserva el contexto para permitir reintentar o cancelar sin retirar la tarea indebidamente. Si la sesión expiró (401), redirige limpiamente a la pantalla de acceso.
  - **Navegación resiliente tras borrado**: Si la eliminación deja vacía una página posterior a la primera (por ejemplo, al borrar el único elemento de la página 2), retrocede automáticamente a la página anterior (`currentPage - 1`) y actualiza el listado. Si queda vacío el primer listado, muestra el estado vacío correspondiente sin solicitar jamás una página 0.
  - **Filtros por estado**: Opciones para *Todas*, *Pendientes*, *En curso* y *Completadas*, mapeadas a los parámetros correspondientes (`status=pending`, `status=in_progress`, `status=completed`, o sin filtro para *Todas*). El listado reinicia automáticamente a la página 1 al cambiar de filtro. Al crear, editar o eliminar una tarea, el contexto del filtro activo se preserva íntegramente.
  - **Traducción de estados**: Mapeo y presentación clara de `pending` (*Pendiente*), `in_progress` (*En curso*) y `completed` (*Completada*).
  - **Paginación sin totales**: Páginas de 20 elementos (`page` y `pageSize=20`) mediante botones *Anterior* y *Siguiente*. La API backend no entrega un contador total de tareas ni total de páginas, por lo que la interfaz omite contadores inventados.
  - **Manejo de páginas parciales y posteriores vacías**:
    - Si una página recibe menos de 20 elementos, el botón *Siguiente* se deshabilita para indicar el fin del listado.
    - Si una página entrega exactamente 20 elementos, se permite avanzar. Si la página subsiguiente resulta estar vacía, la interfaz lo explica con claridad y ofrece la acción directa *Volver a la página anterior*.
  - **Prevención de condiciones de carrera**: Control de solicitudes desincronizadas para que respuestas demoradas no sobreescriban el filtro o página seleccionada activamente.
  - **Manejo de estados y resiliencia**: Carga, listado sin tareas para el filtro seleccionado, y errores con botón de reintento manteniendo la barra de filtros y navegación utilizables.
  - **Accesibilidad y adaptabilidad**: Totalmente navegable mediante teclado (foco automático en el modal, retorno de foco al elemento de origen al cerrar, cierre con `Escape`, envío con `Enter`) y adaptado a pantallas móviles.
- **Estado del sistema** (`/system`): Diagnóstico y disponibilidad de servicios (Ticket 06).
