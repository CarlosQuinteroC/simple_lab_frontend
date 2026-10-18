# 02: Filtrar y recorrer las tareas

**What to build:** Permitir que el usuario encuentre sus tareas por estado y recorra los resultados por páginas, sin necesitar un total que la API no proporciona ni quedar atrapado en una página vacía.

**Blocked by:** 01 — Iniciar sesión y consultar tareas.

**Status:** ready-for-agent

- [ ] Ofrecer los filtros Todas, Pendientes, En curso y Completadas, utilizando los estados existentes de la API y sin enviar filtro de estado para Todas.
- [ ] Solicitar páginas de 20 elementos con los parámetros existentes y volver a la página 1 cada vez que cambie el filtro.
- [ ] Proporcionar Anterior y Siguiente sin contador total de tareas ni de páginas. Deshabilitar Anterior en la primera página.
- [ ] Deshabilitar Siguiente cuando lleguen menos de 20 elementos. Si llegan exactamente 20, permitir avanzar; si la página siguiente está vacía, explicarlo y permitir volver.
- [ ] Distinguir un filtro sin resultados, una página posterior vacía y un fallo de consulta. Mantener utilizable la navegación cuando termine o falle una solicitud.
- [ ] Evitar que una respuesta anterior sustituya los resultados del filtro o página que el usuario tiene seleccionado.
- [ ] Mantener el filtro y la página activos al actualizar el listado después de operaciones de tareas disponibles; una tarea que ya no cumple el filtro no debe permanecer visible. No requiere implementar las mutaciones de otros tickets.
- [ ] Cubrir con pruebas de navegador las tres traducciones de estado, Todas, reinicio de página al filtrar, primera página, página parcial, página completa seguida de una vacía y errores de consulta, simulando respuestas externas.
- [ ] Verificar controles mediante teclado y en móvil, y documentar el comportamiento sin totales y el caso de página posterior vacía.
- [ ] Ejecutar las pruebas relevantes, lint y compilación; comprobar filtros y navegación contra la API real cuando esté disponible, documentando impedimentos.
