# Frontend sencillo para gestionar tareas y consultar el estado del sistema

Status: ready-for-agent

## Problem Statement

El operador del laboratorio dispone de una API de tareas autenticada con Supabase y endpoints públicos de disponibilidad y versión, pero carece de una interfaz para utilizarlos sin conocer los endpoints ni manipular tokens. El frontend existente es una plantilla Next.js sin integración funcional.

Necesita navegar entre opciones claras, iniciar sesión, gestionar sus tareas y comprobar la conexión con el sistema. También necesita instrucciones para ejecutar el frontend y apuntarlo a una API configurable, sin Docker ni una arquitectura compleja.

## Solution

Completar el proyecto Next.js existente con acceso mediante correo y contraseña de Supabase, sesión persistente y navegación lateral entre Inicio, Tareas y Estado del sistema. Ofrecer un listado paginado y filtrable, formularios modales de creación y edición y confirmación de eliminación.

Entregar una interfaz en español, orientada a computadora y adaptable a móvil, con estados de carga, errores comprensibles y uso mediante teclado. Incluir configuración de ejemplo e instrucciones de instalación, arranque y conexión con la API y Supabase. Mantener intacto el contrato del backend.

## User Stories

1. Como operador del laboratorio, quiero iniciar sesión con correo y contraseña, para acceder a mis tareas sin copiar un token manualmente.
2. Como operador del laboratorio, quiero recibir un mensaje claro si las credenciales son incorrectas, para poder corregirlas.
3. Como operador del laboratorio, quiero conservar mi sesión al recargar, para evitar iniciar sesión repetidamente.
4. Como operador del laboratorio, quiero cerrar sesión, para terminar mi acceso desde ese navegador.
5. Como operador del laboratorio, quiero volver a la pantalla de acceso si mi sesión ya no se puede recuperar, para continuar mediante una nueva autenticación.
6. Como operador del laboratorio, quiero navegar mediante un menú lateral con nombres claros, para encontrar las distintas opciones.
7. Como operador del laboratorio, quiero disponer de accesos directos desde Inicio, para llegar rápidamente a las tareas y al estado del sistema.
8. Como operador del laboratorio, quiero ver si la API está accesible desde Inicio, para saber si puedo operar con ella.
9. Como usuario autenticado, quiero ver el título, estado y fecha de creación de mis tareas, para reconocer el trabajo registrado.
10. Como usuario autenticado, quiero ver hasta 20 tareas por página, para mantener el listado manejable.
11. Como usuario autenticado, quiero filtrar por Todas, Pendientes, En curso o Completadas, para consultar el trabajo que me interesa.
12. Como usuario autenticado, quiero volver a la primera página al cambiar el filtro, para comenzar por los primeros resultados del nuevo conjunto.
13. Como usuario autenticado, quiero avanzar y retroceder entre páginas, para recorrer mis tareas.
14. Como usuario autenticado, quiero que Anterior esté deshabilitado en la primera página, para no intentar una navegación inválida.
15. Como usuario autenticado, quiero que Siguiente esté deshabilitado cuando la página tenga menos de 20 tareas, para reconocer el final del listado.
16. Como usuario autenticado, quiero entender cuándo una página posterior está vacía y poder volver, para no quedar atrapado cuando la página anterior tenía exactamente 20 tareas.
17. Como usuario autenticado, quiero distinguir un listado sin tareas de un fallo de conexión, para saber si debo crear una tarea o reintentar más tarde.
18. Como usuario autenticado, quiero crear una tarea desde un formulario modal, para añadir trabajo sin perder de vista el listado.
19. Como usuario autenticado, quiero que se valide un título obligatorio de hasta 200 caracteres, para corregir la entrada antes de enviarla.
20. Como usuario autenticado, quiero que una tarea nueva aparezca como Pendiente, para tener un estado inicial consistente con la API.
21. Como usuario autenticado, quiero editar el título de una tarea en un formulario modal, para corregir su descripción.
22. Como usuario autenticado, quiero cambiar libremente entre los tres estados disponibles al editar, para reflejar el avance o reabrir una tarea.
23. Como usuario autenticado, quiero cancelar un formulario sin guardar, para abandonar cambios que ya no necesito.
24. Como usuario autenticado, quiero confirmar antes de eliminar una tarea, para evitar borrados accidentales.
25. Como usuario autenticado, quiero poder cancelar la eliminación, para conservar la tarea.
26. Como usuario autenticado, quiero ver actualizado el listado después de crear, editar o eliminar, para trabajar con el resultado vigente.
27. Como usuario autenticado, quiero regresar a la página anterior si una eliminación deja vacía una página posterior a la primera, para continuar desde un listado útil.
28. Como usuario autenticado, quiero ver que una operación está en curso y que sus controles están deshabilitados, para evitar envíos duplicados.
29. Como usuario autenticado, quiero conservar lo escrito si falla el guardado, para poder corregir o reintentar sin empezar de nuevo.
30. Como operador del laboratorio, quiero consultar si el proceso de la API responde, para distinguir disponibilidad del proceso y disponibilidad de sus dependencias.
31. Como operador del laboratorio, quiero consultar si la API puede acceder a su dependencia de datos, para detectar problemas externos o de configuración.
32. Como operador del laboratorio, quiero consultar la versión de la API, para identificar la entrega que estoy utilizando.
33. Como operador del laboratorio, quiero ver por separado los resultados de las comprobaciones del sistema, para interpretar un fallo sin confundirlo con el estado del login.
34. Como operador del laboratorio, quiero recibir mensajes comprensibles ante errores de red o de la API, para saber por qué no se ha completado una operación.
35. Como operador del laboratorio, quiero utilizar los formularios y la navegación con teclado, para operar la aplicación sin depender del ratón.
36. Como operador del laboratorio, quiero que la interfaz se adapte a una pantalla móvil, para consultar las opciones sin perder controles esenciales.
37. Como desarrollador del laboratorio, quiero reutilizar el proyecto Next.js creado, para evitar una segunda aplicación o una migración innecesaria.
38. Como desarrollador del laboratorio, quiero configurar la URL de la API y los datos públicos de Supabase mediante variables de entorno, para conectar distintos entornos sin modificar código.
39. Como desarrollador del laboratorio, quiero instrucciones de instalación y arranque sin Docker, para ejecutar el frontend con herramientas locales.
40. Como desarrollador del laboratorio, quiero saber cómo permitir otro origen mediante la configuración CORS existente, para conectar el frontend si cambio su dirección.
41. Como mantenedor, quiero pruebas de los flujos visibles en el navegador, para detectar regresiones en los comportamientos que utiliza el operador.

## Implementation Decisions

- Reutilizar la aplicación Next.js existente con React, TypeScript y Tailwind. Consultar las guías locales de la versión instalada antes de implementar, conforme a las instrucciones del proyecto.
- Mantener una estructura pequeña: navegación y disposición compartidas, gestión de sesión, cliente común de API y componentes de formularios y mensajes. Evitar capas o gestores adicionales que no resuelvan una necesidad concreta.
- Presentar el producto en español, con navegación lateral entre Inicio, Tareas y Estado del sistema. En móvil, adaptar el menú sin perder acceso a ninguna sección.
- Autenticar directamente contra Supabase Auth mediante correo y contraseña. El backend no ofrece endpoints propios de login. Mantener la sesión, utilizar el token de acceso vigente y permitir cerrarla. Si la sesión no puede recuperarse, volver al acceso con un mensaje claro.
- No mostrar ni conservar tareas de una sesión anterior al cerrar sesión o cambiar de usuario. La autorización y el aislamiento de datos siguen siendo responsabilidad de la API y Supabase.
- Consumir el contrato existente de tareas: GET y POST sobre `/api/tasks`, y PUT y DELETE sobre `/api/tasks/{id}`. No se necesita una pantalla de detalle separada.
- El listado solicita `page`, `pageSize=20` y, cuando corresponda, `status`. La respuesta contiene `items`, `page` y `pageSize`, sin total ni indicador de página siguiente. No inventar contadores de resultados.
- Mostrar `id` como identificador interno; presentar título, estado y fecha de creación al usuario. Respetar el orden entregado por la API.
- Traducir los estados `pending`, `in_progress` y `completed` como Pendiente, En curso y Completada. Los filtros se presentan como Todas, Pendientes, En curso y Completadas.
- Al cambiar el filtro, reiniciar la página a 1. Deshabilitar Anterior en la primera página. Deshabilitar Siguiente cuando la respuesta tenga menos de 20 elementos; con exactamente 20, permitir avanzar y manejar una posible página vacía con una opción para volver.
- Crear con un modal que envía únicamente el título; la API asigna el estado Pendiente. Editar con un modal que envía título y estado. El título es obligatorio y admite hasta 200 caracteres; no aceptar títulos compuestos solo de espacios.
- Confirmar antes de ejecutar DELETE. Tratar su respuesta 204 como éxito sin intentar leer un cuerpo JSON.
- Tras una mutación, volver a consultar el listado con el filtro activo. Si la tarea deja de pertenecer al filtro actual, su ausencia es el resultado esperado. Cuando una eliminación deje vacía una página posterior a la primera, retroceder y consultar la página anterior.
- Mostrar cargas, vacíos y errores; evitar envíos duplicados, conservar el formulario cuando falle una operación y permitir cancelar los modales. Usar etiquetas, foco y controles adecuados para operar mediante teclado.
- Consultar los endpoints públicos `/health/live`, `/health/ready` y `/version` para Estado del sistema. Distinguir los fallos de cada consulta. Readiness comprueba la dependencia de datos y no garantiza que el login funcione.
- Inicio mostrará accesos directos y una indicación de conectividad con la API. No añadir un panel de métricas, sondeo continuo ni estadísticas ajenas al contrato existente.
- Configurar URL base de API, URL de Supabase y clave pública de Supabase mediante variables de entorno y entregar una plantilla de configuración. No utilizar credenciales administrativas en el navegador.
- Documentar instalación de dependencias, configuración local, arranque de desarrollo y compilación. Ejemplo de API local: `http://localhost:5084`; frontend local: `http://localhost:3000`.
- El backend ya admite el origen `http://localhost:3000`. Documentar el ajuste existente `Cors__AllowedOrigins` si se utiliza otro origen, sin modificar el backend como parte de esta entrega.
- No cambiar esquemas de datos, contratos de API, estados de tareas ni reglas de propiedad existentes.

## Testing Decisions

- Frontera principal aprobada por el usuario: flujos completos del frontend desde el navegador, con respuestas controladas de API y Supabase, más una comprobación manual contra servicios reales.
- Una buena prueba comprueba acciones y resultados visibles, navegación, mensajes y persistencia de sesión; no depende de nombres de funciones internas, estructura de componentes ni clases CSS. Los contratos de red observables pueden verificarse cuando forman parte del comportamiento, como filtros y token Bearer.
- Cubrir desde esa misma frontera acceso y sesión, navegación, listado, filtros y paginación, modales y operaciones de tareas, y estado del sistema. No añadir una suite por cada componente ni duplicar las pruebas internas del backend.
- El frontend no tiene infraestructura de pruebas de flujos instalada. Introducir una única herramienta de pruebas de navegador e interceptar las respuestas externas desde esa frontera, sin crear endpoints de prueba dentro de la aplicación ni depender de un Supabase remoto para las comprobaciones automatizadas.
- Existe como precedente en el backend una suite de integración HTTP que comprueba CRUD, autenticación, validación, diagnósticos, readiness y CORS utilizando un servidor de aplicación de prueba y un transporte de Supabase simulado. Adoptar su principio de probar comportamiento público con dependencias controladas; no trasladar sus herramientas .NET al frontend.
- Comprobar login válido e inválido, restauración de sesión tras recarga, cierre de sesión y sesión que ya no se puede recuperar. Verificar que los fallos de autenticación no se presentan como listados vacíos.
- Comprobar listado vacío, filtros que reinician la página, primera página, última página parcial y última página de exactamente 20 elementos seguida de una página vacía. No exigir totales que la API no proporciona.
- Comprobar creación con estado inicial Pendiente, límites del título, edición de título y estado, cancelación de formularios, confirmación y cancelación de borrado, respuesta 204 y recuperación de página tras eliminar el último elemento visible.
- Comprobar carga y bloqueo de envío duplicado, conservación de datos cuando falle el guardado, errores de red y resultados independientes de health y versión, incluido readiness no disponible.
- Comprobar navegación y formularios con teclado y una vista móvil representativa. Evitar pruebas basadas únicamente en capturas o en la existencia de componentes.
- Realizar una comprobación manual del login y operaciones principales contra el proyecto Supabase y backend reales, con configuración local válida; documentar cualquier requisito que impida ejecutarla.
- Ejecutar las pruebas de navegador incorporadas, lint y compilación. Verificar que las instrucciones y variables permiten cambiar la URL de API sin editar código.

## Out of Scope

- Docker, contenedores, infraestructura de despliegue y pipelines de CI/CD.
- Recrear o sustituir el proyecto Next.js existente.
- Modificaciones en el backend, esquema de Supabase, RLS o contratos de API.
- Registro, recuperación de contraseña, inicio de sesión social y administración de usuarios o roles.
- Funcionalidades de laboratorio distintas de las tareas que ya soporta la API.
- Búsqueda por texto, ordenación configurable, totales, estadísticas, edición masiva y estados de tarea adicionales.
- Pantalla independiente de detalle de tarea, notificaciones, actualización en tiempo real, sondeo continuo y uso sin conexión.
- Arquitectura compleja o una suite separada por cada componente.

## Further Notes

El alcance funcional se acordó y aprobó en la conversación y quedó recogido previamente en el plan del frontend. El usuario confirmó además la frontera de pruebas de flujos en navegador con dependencias simuladas y comprobación manual con los servicios reales.

Orden de trabajo acordado: estructura y configuración; autenticación y sesión; tareas; Inicio y Estado del sistema; documentación y comprobaciones.

La especificación se publica en el tracker local Markdown del proyecto con la etiqueta de triage `ready-for-agent`. La funcionalidad aún no está implementada. Esta entrega no crea tickets de implementación ni implica publicar en un tracker externo.
