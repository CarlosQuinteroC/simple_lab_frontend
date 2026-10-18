# 01: Iniciar sesión y consultar tareas

**What to build:** Permitir que el operador configure y ejecute el frontend existente sin Docker, inicie sesión con Supabase y consulte sus primeras 20 tareas desde una interfaz clara. Entregar el primer flujo completo desde el navegador hasta la API, con sesión y navegación compartidas para las siguientes entregas.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Reutilizar el proyecto Next.js existente, con React, TypeScript y Tailwind, consultando las guías locales exigidas por las instrucciones del proyecto antes de implementar.
- [ ] Configurar URL base de API, URL de Supabase y clave pública de Supabase mediante variables de entorno; incluir plantilla de configuración sin credenciales administrativas.
- [ ] Iniciar sesión con correo y contraseña mediante Supabase Auth y mostrar errores claros ante credenciales inválidas o fallos de conexión. No implementar registro ni recuperación de contraseña.
- [ ] Conservar la sesión al recargar, utilizar el token de acceso vigente como Bearer en las solicitudes de tareas y volver al acceso si la sesión ya no puede recuperarse.
- [ ] Permitir cerrar sesión y evitar mostrar datos de una sesión anterior al salir o cambiar de usuario.
- [ ] Proporcionar navegación lateral en español con Inicio, Tareas y Estado del sistema. La consulta de tareas debe funcionar en esta entrega; las otras secciones se completan en el ticket 06.
- [ ] Consultar la primera página de 20 tareas mediante la API existente, mostrando título, estado traducido y fecha de creación, sin inventar un total y respetando el orden de la API.
- [ ] Distinguir carga, listado vacío, error de red y sesión inválida. No presentar fallos de autenticación como ausencia de tareas.
- [ ] Permitir el uso del acceso y la navegación con teclado y en una pantalla móvil representativa, con etiquetas y foco visibles.
- [ ] Introducir una única herramienta de pruebas de flujos en navegador, con respuestas controladas de Supabase y API, sin endpoints de prueba en la aplicación ni dependencia de servicios remotos para la suite automatizada.
- [ ] Probar desde el navegador login válido e inválido, persistencia tras recarga, cierre de sesión, cambio de usuario, sesión irrecuperable, listado y sus estados de carga, vacío y error. Verificar el envío del Bearer sin depender de detalles internos de componentes.
- [ ] Documentar instalación, variables de entorno, arranque sin Docker y ejecución de las pruebas. Usar como ejemplos API local en http://localhost:5084 y frontend en http://localhost:3000.
- [ ] Ejecutar las pruebas incorporadas, lint y compilación. Comprobar manualmente acceso y consulta contra servicios reales cuando exista configuración válida, registrando cualquier impedimento.
- [ ] No modificar el backend, contratos, esquema de datos ni políticas de propiedad; mantener pequeña la integración compartida.
