# 05: Eliminar tareas con confirmación

**What to build:** Permitir que el usuario elimine una tarea de forma consciente, pueda cancelar el borrado y continúe navegando por un listado útil aunque desaparezca el último elemento de su página.

**Blocked by:** 02 — Filtrar y recorrer las tareas. Incluye transitivamente el ticket 01.

**Status:** ready-for-agent

- [ ] Mostrar una confirmación que identifique la tarea antes de ejecutar el borrado y permita confirmar o cancelar.
- [ ] Al cancelar, no enviar DELETE ni retirar la tarea del listado.
- [ ] Al confirmar, utilizar el DELETE existente con el identificador y token vigentes. Interpretar 204 sin cuerpo como éxito sin intentar leer JSON.
- [ ] Mostrar la operación en curso y evitar confirmaciones o solicitudes de borrado duplicadas.
- [ ] Tras éxito, volver a consultar con el filtro activo y actualizar los resultados.
- [ ] Si la eliminación deja vacía una página posterior a la primera, retroceder y consultar la página anterior. Si queda vacío el primer listado, mostrar su estado vacío sin intentar una página 0.
- [ ] Ante un fallo, no mostrar un éxito ni retirar la tarea como si el borrado se hubiera completado. Permitir reintentar o cancelar; aplicar la gestión compartida de sesión inválida.
- [ ] Permitir confirmación y cancelación mediante teclado, gestionar el foco y mantener los controles utilizables en móvil.
- [ ] Probar en navegador cancelación sin petición, éxito 204, error, bloqueo de doble envío, preservación del filtro, eliminación del último elemento en una página posterior y eliminación de la última tarea del primer listado. Usar datos simulados sin depender de creación ni edición.
- [ ] Documentar confirmación y navegación tras el borrado. Comprobar manualmente con una tarea de prueba cuando haya configuración real y registrar impedimentos.
- [ ] Ejecutar las pruebas relevantes, lint y compilación sin cambiar contratos de API ni introducir borrado masivo.
