# Plan acordado del frontend

Estado: alcance aprobado. Pendiente de implementación.

## Objetivo

Crear una interfaz sencilla para operar las tareas disponibles en el backend, con navegación clara para personas que no necesitan conocer los endpoints.

Se aprovechará el proyecto Next.js existente con React, TypeScript y Tailwind. No se requiere Docker, cambios en el backend ni funciones que no tengan soporte en la API actual.

## Pantallas y navegación

Menú lateral con Inicio, Tareas y Estado del sistema. Diseño orientado a computadora y adaptable a móvil.

### Acceso

- Inicio de sesión con correo y contraseña mediante Supabase Auth.
- Sesión persistente y cierre de sesión.
- Las solicitudes de tareas envían el token de acceso vigente como Bearer.
- Si no se puede recuperar la sesión, volver al acceso con un mensaje claro.
- Sin registro ni recuperación de contraseña en esta versión.

### Inicio

- Accesos directos a las secciones.
- Estado de conexión con la API.

### Tareas

- Listado de 20 tareas por página, mostrando título, estado y fecha de creación.
- Filtro: Todas, Pendientes, En curso y Completadas.
- Al cambiar el filtro, volver a la primera página.
- Botones Anterior y Siguiente, sin contador total: la API no devuelve total ni indicador de página siguiente.
- Deshabilitar Anterior en la primera página. Deshabilitar Siguiente cuando lleguen menos de 20 elementos. Si llegan exactamente 20, permitir avanzar; una página posterior vacía mostrará un mensaje y permitirá volver.
- Crear mediante un formulario modal con título obligatorio, máximo 200 caracteres. El estado inicial es Pendiente.
- Editar mediante un formulario modal con título y estado.
- Pedir confirmación antes de eliminar.
- Actualizar el listado después de las operaciones. Si una eliminación deja vacía una página posterior a la primera, retroceder y consultar la página anterior.

### Estado del sistema

- Consultar `/health/live`, `/health/ready` y `/version`.
- Mostrar disponibilidad, comprobación de dependencias y versión con mensajes comprensibles.
- La comprobación de dependencias no se presentará como una prueba del funcionamiento del login.

## Integración y configuración

- Mantener la integración pequeña: cliente de API compartido, gestión de sesión y componentes para navegación, formularios y mensajes. No introducir capas adicionales sin necesidad.
- CRUD mediante `/api/tasks` y `/api/tasks/{id}`.
- Traducir los estados de la API: `pending` → Pendiente, `in_progress` → En curso, `completed` → Completada.
- Incluir `.env.example` con la URL base de la API, URL de Supabase y clave pública de Supabase.
- Usar `http://localhost:5084` como ejemplo local de API y `http://localhost:3000` para Next.js.
- Documentar en el README cómo instalar dependencias, crear `.env.local`, configurar API y Supabase y arrancar el frontend sin Docker.
- Documentar que CORS ya permite `http://localhost:3000`; para otro origen, explicar la configuración existente `Cors__AllowedOrigins` del backend.

## Experiencia común

- Estados de carga, listados vacíos y errores claros.
- Deshabilitar acciones mientras se procesan para evitar envíos duplicados.
- Conservar lo escrito en el formulario si una operación falla.
- Formularios con etiquetas, controles accesibles y uso mediante teclado.

## Orden de implementación

1. Estructura visual, navegación y configuración de conexión.
2. Autenticación y sesión.
3. Listado, filtros, paginación y operaciones de tareas.
4. Inicio y estado del sistema.
5. Documentación y comprobaciones.

Antes de escribir código, consultar las guías locales de Next.js indicadas en `AGENTS.md`.

## Comprobaciones de aceptación

- Login válido e inválido, persistencia de sesión y cierre de sesión.
- Crear, editar y eliminar tareas; comprobar validaciones y cancelación del borrado.
- Cambiar filtros y navegar entre páginas, incluyendo listado vacío y última página completa.
- API inaccesible, error al guardar y sesión caducada sin dejar la interfaz bloqueada.
- Resultados correctos y fallidos de health.
- Navegación en computadora y móvil, y operación de formularios con teclado.
- Ejecutar `npm run lint` y `npm run build`.
- Verificar que las instrucciones permiten apuntar a otra URL de API sin modificar código.
