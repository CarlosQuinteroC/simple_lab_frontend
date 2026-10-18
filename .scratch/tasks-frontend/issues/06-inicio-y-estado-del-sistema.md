# 06: Consultar el estado del sistema desde Inicio y Diagnóstico

**What to build:** Dar al operador una entrada clara a la aplicación con accesos directos y conectividad, y una sección Estado del sistema que permita interpretar disponibilidad, dependencias y versión de la API sin conocer sus endpoints.

**Blocked by:** 01 — Iniciar sesión y consultar tareas.

**Status:** ready-for-agent

- [ ] Completar Inicio con accesos directos a Tareas y Estado del sistema y una indicación de conexión con la API configurada.
- [ ] Completar Estado del sistema con consultas a los endpoints públicos existentes de liveness, readiness y versión. No requerir que la API cambie su autenticación ni crear nuevos endpoints.
- [ ] Mostrar resultados y errores de cada consulta de forma independiente, con mensajes en español y sin ocultar un éxito porque otra consulta falle.
- [ ] Distinguir disponibilidad del proceso y acceso a la dependencia de datos. No presentar readiness como comprobación del funcionamiento del login.
- [ ] Mostrar la versión proporcionada por la API sin inventar una versión del servicio ni métricas adicionales.
- [ ] Mostrar carga y errores de red sin dejar la pantalla bloqueada. No incorporar sondeo continuo, estadísticas ni un panel de métricas fuera del alcance.
- [ ] Mantener la navegación entre las tres secciones, accesos directos y resultados utilizables mediante teclado y en móvil.
- [ ] Probar desde el navegador accesos directos, conectividad, resultados correctos, readiness no disponible, fallos independientes de health y versión y API inaccesible, con respuestas externas simuladas.
- [ ] Completar las instrucciones para apuntar a otra URL de API sin editar código, configurar Supabase, arrancar sin Docker y ejecutar las comprobaciones. Explicar el origen local ya permitido y el ajuste existente Cors__AllowedOrigins para otro origen.
- [ ] Comprobar manualmente diagnósticos contra la API real y verificar las instrucciones de conexión con configuración válida, registrando impedimentos cuando no sea posible.
- [ ] Ejecutar las pruebas relevantes, lint y compilación. No depender de que creación, edición, borrado o filtros estén implementados para demostrar esta entrega.
