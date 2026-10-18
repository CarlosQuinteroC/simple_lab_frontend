# 03: Crear tareas

**What to build:** Permitir que el usuario cree una tarea desde el listado mediante un formulario modal sencillo, reciba el resultado y pueda corregir o reintentar sin perder lo escrito.

**Blocked by:** 01 — Iniciar sesión y consultar tareas.

**Status:** ready-for-agent

- [ ] Abrir desde Tareas un formulario modal para introducir el título, sin solicitar estado ni propietario.
- [ ] Validar título obligatorio, rechazar títulos compuestos solo de espacios y respetar el máximo de 200 caracteres. Mostrar errores asociados al campo.
- [ ] Enviar únicamente el título mediante el POST existente y utilizar la sesión del usuario; el estado inicial lo asigna la API como Pendiente.
- [ ] Permitir cancelar el formulario sin enviar una solicitud ni crear una tarea.
- [ ] Indicar que se está guardando y evitar envíos duplicados mientras la solicitud esté pendiente.
- [ ] Tras éxito, cerrar el formulario y volver a consultar el listado con su contexto vigente. Cuando haya filtros, no mostrar una nueva tarea Pendiente dentro de un filtro incompatible.
- [ ] Ante un error, mostrar un mensaje claro, conservar el título y permitir reintentar o cancelar. Aplicar el comportamiento compartido si la sesión ya no es válida.
- [ ] Gestionar foco al abrir y cerrar el modal, permitir operación con teclado y mantener el formulario utilizable en móvil.
- [ ] Probar el flujo visible de creación, título vacío y de espacios, límites de longitud, cancelación, respuesta pendiente sin doble envío, error y reintento con texto conservado, usando la infraestructura de navegador existente y respuestas simuladas.
- [ ] Actualizar las instrucciones de uso y comprobar manualmente una creación real cuando haya configuración válida; registrar cualquier impedimento.
- [ ] Ejecutar las pruebas relevantes, lint y compilación. No modificar contratos ni añadir estados al backend.
