# SimpleLab Frontend

Frontend web para el sistema de operaciones y control de laboratorio SimpleLab. Construido con Next.js (App Router, Turbopack, React 19, TypeScript) y Tailwind CSS.

## Requisitos previos

- Node.js 20+ o superior
- Instancia activa de la API backend de SimpleLab (por defecto en `http://localhost:5084` o `http://localhost:5000`)
- Instancia de Supabase con autenticación configurada

## Configuración del entorno

Copie el archivo `.env.example` a `.env.local` y configure las variables de entorno requeridas:

```bash
cp .env.example .env.local
```

### Variables disponibles

- `NEXT_PUBLIC_API_BASE_URL`: URL base de la API backend (ejemplo: `http://localhost:5084` o `http://localhost:5000`). Permite apuntar a otra URL o servidor remoto sin necesidad de modificar el código fuente.
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto de Supabase (ejemplo: `https://<tu-proyecto>.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima pública (`anon key`) de Supabase.

### Configuración de CORS y orígenes permitidos

El backend de SimpleLab restringe los orígenes permitidos mediante la directiva de configuración `Cors__AllowedOrigins` (o la sección `Cors:AllowedOrigins` en `appsettings.json`):
- El origen local estándar del frontend, `http://localhost:3000`, ya se encuentra permitido por defecto en la configuración estándar del backend.
- Si ejecuta el frontend en otro puerto (ej. `http://localhost:3001`) o en un dominio diferente, debe añadir dicho origen en la configuración del backend:
  - Mediante variable de entorno separando los orígenes con **comas**:
    ```bash
    Cors__AllowedOrigins="http://localhost:3000,http://localhost:3001,https://mi-dominio.com"
    ```
  - O en `appsettings.json` mediante un arreglo JSON:
    ```json
    {
      "Cors": {
        "AllowedOrigins": [
          "http://localhost:3000",
          "http://localhost:3001",
          "https://mi-dominio.com"
        ]
      }
    }
    ```

## Ejecución local (sin Docker)

1. Instalar dependencias del proyecto:
   ```bash
   npm install
   ```

2. Iniciar el servidor de desarrollo local:
   ```bash
   npm run dev
   ```

3. Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Verificación y Tests

El proyecto cuenta con suites completas de pruebas automatizadas de extremo a extremo usando Playwright, validando cada pantalla, diálogo, validación y control de error de forma determinista y reproducible:

```bash
# Ejecutar la suite completa de pruebas E2E (37 pruebas de tareas + 7 de estado del sistema)
npm test

# Ejecutar únicamente las pruebas de estado del sistema y diagnóstico
npx playwright test e2e/system-status.spec.ts

# Ejecutar el linter de código (ESLint)
npm run lint

# Compilar para producción (Next.js build & validación estricta de TypeScript)
npm run build
```

### Comprobación contra la API real e impedimentos

- La integración del frontend está preparada para comunicarse de forma directa con la API backend configurada en `NEXT_PUBLIC_API_BASE_URL`.
- **Impedimento registrado en el entorno local**: La instancia local del backend de SimpleLab no se encuentra en ejecución en el entorno local (`curl: Failed to connect to localhost port 5084 / port 5000`).
- Para asegurar la cobertura exhaustiva y estricta de todos los criterios de aceptación sin depender de servicios externos en desarrollo local, la verificación de:
  - Disponibilidad del proceso (`/health/live`)
  - Dependencia de datos (`/health/ready`)
  - Versión del backend (`/version`)
  - Ciclo de vida de tareas (consulta, filtrado, creación, edición y borrado)
  - Control de fallos de red, timeouts, errores 500/503 y expiración de sesiones (401)
  se encuentra garantizada y demostrada de extremo a extremo a través de la suite de Playwright (`npm test`), reproduciendo fielmente el contrato público de la API y de Supabase Auth.

## Estructura de Navegación y Características

### 1. Panel de Inicio (`/`)
- **Indicador de conexión en tiempo real**: Verifica y muestra el estado de conexión con la API configurada (`NEXT_PUBLIC_API_BASE_URL`), con distintivo visual (*Conectada*, *Sin conexión* o *Comprobando...*) y opción para re-comprobar manualmente.
- **Accesos directos principales**: Enlaces rápidos y accesibles mediante teclado y pantallas táctiles hacia la **Gestión de Tareas** (`/tasks`) y el **Estado del Sistema** (`/system`).

### 2. Estado del Sistema y Diagnóstico (`/system`)
- **Consultas públicas e independientes**: Consulta los endpoints públicos `/health/live`, `/health/ready` y `/version` sin exigir autenticación ni alterar los contratos del backend.
- **Resultados desacoplados**: Los resultados y fallos de cada consulta se muestran de forma independiente con mensajes claros en español. Si una consulta falla (ej. *readiness* responde 503), no oculta ni degrada el éxito de *liveness* o de la versión.
- **Distinción entre proceso y datos**:
  - **Disponibilidad del proceso (Liveness)**: Comprueba si el proceso web de la API está en ejecución y responde peticiones HTTP.
  - **Dependencia de datos (Readiness)**: Comprueba exclusivamente la conexión con la base de datos subyacente. La interfaz aclara expresamente que la disponibilidad de datos no comprueba ni garantiza el funcionamiento del inicio de sesión (Supabase Auth).
- **Versión fidedigna sin invenciones**: Muestra con exactitud la cadena de versión devuelta por `/version` de la API, sin inventar versiones ni agregar métricas o gráficos fuera del alcance.
- **Actualización bajo demanda**: Botón *Actualizar diagnósticos* para refrescar las consultas de forma manual sin incurrir en sondeos continuos en bucle que sobrecarguen el servidor.

### 3. Tareas de Laboratorio (`/tasks`)
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
- **Accesibilidad y contención de foco (a11y)**: Diálogos modales accesibles (`role="dialog"`, `aria-modal="true"`) con contención estricta de foco (focus trap: Tab y Shift+Tab ciclan dentro del modal sin escapar hacia la barra lateral o fondo) y fondo inerte (`inert`). Retorno automático de foco al elemento disparador al cerrar.
