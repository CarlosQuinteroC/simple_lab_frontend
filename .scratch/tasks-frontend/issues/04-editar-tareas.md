# 04: Editar título y estado

**What to build:** Permitir que el usuario corrija el título o cambie el estado de una tarea existente desde un modal, sin perder el contexto del listado ni sus cambios cuando falle el guardado.

**Blocked by:** 01 — Iniciar sesión y consultar tareas.

**Status:** ready-for-agent

- [ ] Abrir un formulario modal desde una tarea del listado con su título y estado actuales. No exigir haber implementado creación ni una pantalla de detalle.
- [ ] Permitir cambiar libremente entre Pendiente, En curso y Completada, con los valores existentes pending, in_progress y completed.
- [ ] Validar el título obligatorio, no compuesto solo de espacios y de hasta 200 caracteres.
- [ ] Enviar título y estado mediante el PUT existente para el identificador de la tarea, utilizando el token vigente.
- [ ] Permitir cancelar sin guardar ni alterar la tarea y evitar envíos duplicados mientras se procesa la operación.
- [ ] Tras éxito, cerrar el modal y volver a consultar el listado con su contexto vigente. Si hay un filtro activo que la tarea ya no cumple, dejar de mostrarla; no reiniciar el filtro por guardar.
- [ ] Ante un error de validación, red o tarea no disponible, mostrar un mensaje comprensible y conservar las entradas para corregir, reintentar o cancelar. Usar la recuperación compartida ante sesión inválida.
- [ ] Mantener el modal accesible por teclado, con gestión de foco, y utilizable en móvil.
- [ ] Probar desde el navegador la precarga, cambio de título, transiciones entre los estados, validación, cancelación, actualización visible, error con datos conservados y prevención de doble envío. Utilizar tareas simuladas preexistentes, sin depender del ticket de creación.
- [ ] Respetar la integración con filtros cuando esté disponible; la entrega de filtros debe conservar este comportamiento si se implementa después.
- [ ] Actualizar las instrucciones de uso, realizar una edición manual real si existe configuración y registrar impedimentos. Ejecutar las pruebas relevantes, lint y compilación.
