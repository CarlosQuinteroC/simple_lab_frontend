import { test, expect, Page } from '@playwright/test';

test.describe('Ticket 03: Crear tareas', () => {
  const MOCK_TOKEN = 'mock-access-token-t03';
  const MOCK_USER = {
    id: 'user-t03',
    email: 'operador@simplelab.local',
  };

  async function loginAsOperator(page: Page) {
    await page.getByLabel(/correo electrónico/i).fill('operador@simplelab.local');
    await page.getByLabel(/contraseña/i).fill('password123');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
  }

  test.beforeEach(async ({ page }) => {
    // Intercept Supabase Auth user request
    await page.route('**/auth/v1/user*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER),
      });
    });

    // Intercept Supabase Auth token request
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: MOCK_TOKEN,
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: MOCK_USER,
        }),
      });
    });
  });

  test('Slice 1: Abre modal de creación con foco en título y permite cancelar con botón o Escape sin enviar solicitud', async ({ page }) => {
    let postRequestSent = false;

    await page.route('**/api/tasks*', async (route) => {
      if (route.request().method() === 'POST') {
        postRequestSent = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-id',
            title: 'No debería enviarse',
            status: 'pending',
            createdAt: new Date().toISOString(),
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: '1', title: 'Tarea Existente 1', status: 'pending', createdAt: new Date().toISOString() },
          ],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByText('Tarea Existente 1')).toBeVisible();

    // El botón para abrir el modal debe estar visible
    const openCreateBtn = page.getByRole('button', { name: /nueva tarea/i });
    await expect(openCreateBtn).toBeVisible();

    // Abrir el modal
    await openCreateBtn.click();

    // El modal debe estar visible con rol dialog y título apropiado
    const modal = page.getByRole('dialog', { name: /nueva tarea/i });
    await expect(modal).toBeVisible();

    // El campo de título debe tener foco automático
    const titleInput = modal.getByLabel(/título/i);
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toBeFocused();

    // El modal NO debe solicitar estado ni propietario
    await expect(modal.getByLabel(/estado/i)).not.toBeVisible();
    await expect(modal.getByLabel(/propietario/i)).not.toBeVisible();

    // Cancelar usando el botón Cancelar
    const cancelBtn = modal.getByRole('button', { name: /cancelar/i });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // El modal debe cerrarse
    await expect(modal).not.toBeVisible();
    expect(postRequestSent).toBe(false);

    // Reabrir y probar cierre con tecla Escape
    await openCreateBtn.click();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    expect(postRequestSent).toBe(false);
  });

  test('Slice 2: Validación de título obligatorio, rechazo de solo espacios y límite de 200 caracteres', async ({ page }) => {
    let postRequestSent = false;

    await page.route('**/api/tasks*', async (route) => {
      if (route.request().method() === 'POST') {
        postRequestSent = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'err', title: 'fail', status: 'pending', createdAt: new Date().toISOString() }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await page.getByRole('button', { name: /nueva tarea/i }).click();
    const modal = page.getByRole('dialog', { name: /nueva tarea/i });
    const titleInput = modal.getByLabel(/título/i);
    const submitBtn = modal.getByRole('button', { name: /crear tarea/i });

    // Intento 1: Enviar con campo vacío
    await submitBtn.click();
    await expect(modal.getByText(/el título de la tarea es obligatorio/i)).toBeVisible();
    expect(postRequestSent).toBe(false);

    // Intento 2: Enviar solo con espacios
    await titleInput.fill('     ');
    await submitBtn.click();
    await expect(modal.getByText(/el título de la tarea es obligatorio/i)).toBeVisible();
    expect(postRequestSent).toBe(false);

    // Intento 3: Límite de 200 caracteres
    const longTitle = 'a'.repeat(201);
    await titleInput.fill(longTitle);
    // Verificar que el atributo maxLength impide ingresar más de 200 o que el valor queda recortado a 200
    const inputValue = await titleInput.inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(200);

    // El modal sigue abierto y no se ha emitido POST
    await expect(modal).toBeVisible();
    expect(postRequestSent).toBe(false);
  });

  test('Slice 3 & 4: Creación exitosa envía únicamente título con Bearer token, previene doble envío y refresca lista según filtro', async ({ page }) => {
    const postPayloads: unknown[] = [];
    const postHeaders: Record<string, string>[] = [];
    let tasksList = [
      { id: 't1', title: 'Tarea Previa 1', status: 'pending', createdAt: new Date().toISOString() },
    ];

    await page.route('**/api/tasks*', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        postPayloads.push(request.postDataJSON());
        postHeaders.push(request.headers());

        // Demora leve para verificar estado guardando y bloqueo
        await new Promise((resolve) => setTimeout(resolve, 300));

        const newTask = {
          id: 't-new-1',
          title: 'Nueva Tarea de Laboratorio',
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        tasksList = [newTask, ...tasksList];

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newTask),
        });
        return;
      }

      // GET
      const url = new URL(request.url());
      const statusFilter = url.searchParams.get('status');
      let filtered = tasksList;
      if (statusFilter) {
        filtered = tasksList.filter((t) => t.status === statusFilter);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: filtered,
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByText('Tarea Previa 1')).toBeVisible();

    // Abrir modal de creación
    await page.getByRole('button', { name: /nueva tarea/i }).click();
    const modal = page.getByRole('dialog', { name: /nueva tarea/i });
    const titleInput = modal.getByLabel(/título/i);
    const submitBtn = modal.getByRole('button', { name: /crear tarea/i });

    await titleInput.fill('Nueva Tarea de Laboratorio');

    // Clic en Crear tarea
    await submitBtn.click();

    // Durante el guardado, debe mostrar "Guardando..." y estar deshabilitado
    await expect(modal.getByText(/guardando/i)).toBeVisible();
    await expect(titleInput).toBeDisabled();

    // Tras el éxito, el modal debe cerrarse
    await expect(modal).not.toBeVisible();

    // Debe haberse enviado un único POST con { title: ... } y Bearer token
    expect(postPayloads.length).toBe(1);
    expect(postPayloads[0]).toEqual({ title: 'Nueva Tarea de Laboratorio' });
    expect(postHeaders[0]['authorization']).toBe(`Bearer ${MOCK_TOKEN}`);

    // El listado debe haberse refrescado mostrando la nueva tarea con estado Pendiente
    await expect(page.getByText('Nueva Tarea de Laboratorio')).toBeVisible();
    await expect(page.getByRole('cell', { name: /^Pendiente$/i }).first()).toBeVisible();
  });

  test('Slice 4 (cont): Si el filtro activo es incompatible (ej. Completadas), la nueva tarea no se muestra allí', async ({ page }) => {
    let tasksList = [
      { id: 'c1', title: 'Tarea Completada Existente', status: 'completed', createdAt: new Date().toISOString() },
    ];

    await page.route('**/api/tasks*', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        const payload = request.postDataJSON();
        const newTask = {
          id: 't-pending-2',
          title: payload.title,
          status: 'pending', // La API siempre asigna pending
          createdAt: new Date().toISOString(),
        };
        tasksList = [newTask, ...tasksList];
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newTask),
        });
        return;
      }

      // GET
      const url = new URL(request.url());
      const statusFilter = url.searchParams.get('status');
      let filtered = tasksList;
      if (statusFilter) {
        filtered = tasksList.filter((t) => t.status === statusFilter);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: filtered,
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    // Cambiar al filtro "Completadas"
    await page.getByRole('button', { name: /^Completadas$/i }).click();
    await expect(page.getByText('Tarea Completada Existente')).toBeVisible();

    // Crear una tarea estando en el filtro "Completadas"
    await page.getByRole('button', { name: /nueva tarea/i }).click();
    const modal = page.getByRole('dialog', { name: /nueva tarea/i });
    await modal.getByLabel(/título/i).fill('Tarea Creada en Filtro Incompatible');
    await modal.getByRole('button', { name: /crear tarea/i }).click();

    // El modal se cierra
    await expect(modal).not.toBeVisible();

    // La nueva tarea creada (estado pending) NO debe aparecer en el filtro "Completadas"
    await expect(page.getByText('Tarea Creada en Filtro Incompatible')).not.toBeVisible();
    await expect(page.getByText('Tarea Completada Existente')).toBeVisible();

    // Si conmutamos a "Pendientes" o "Todas", la tarea debe ser visible
    await page.getByRole('button', { name: /^Pendientes$/i }).click();
    await expect(page.getByText('Tarea Creada en Filtro Incompatible')).toBeVisible();
  });

  test('Slice 5: Error al guardar muestra mensaje claro, conserva el título escrito y permite reintentar o cancelar', async ({ page }) => {
    let failPost = true;
    let postAttempts = 0;

    await page.route('**/api/tasks*', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        postAttempts++;
        if (failPost) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Error interno en la base de datos' }),
          });
          return;
        }

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'recovered-task',
            title: request.postDataJSON().title,
            status: 'pending',
            createdAt: new Date().toISOString(),
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: postAttempts > 1 ? [{ id: 'recovered-task', title: 'Título que no debe perderse', status: 'pending', createdAt: new Date().toISOString() }] : [],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await page.getByRole('button', { name: /nueva tarea/i }).click();
    const modal = page.getByRole('dialog', { name: /nueva tarea/i });
    const titleInput = modal.getByLabel(/título/i);
    const submitBtn = modal.getByRole('button', { name: /crear tarea/i });

    await titleInput.fill('Título que no debe perderse');
    await submitBtn.click();

    // Debe mostrar error claro en el modal
    const alert = modal.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/error en el servidor|error interno/i);

    // El título escrito debe conservarse en el campo
    await expect(titleInput).toHaveValue('Título que no debe perderse');

    // Ahora simular que el servidor se recupera y reintentar
    failPost = false;
    await submitBtn.click();

    // Debe cerrarse el modal exitosamente y mostrar la tarea
    await expect(modal).not.toBeVisible();
    await expect(page.getByText('Título que no debe perderse')).toBeVisible();
  });

  test('Slice 6: Sesión expirada (401) al guardar redirige a login con mensaje', async ({ page }) => {
    await page.route('**/api/tasks*', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Token expirado o inválido' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], page: 1, pageSize: 20 }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await page.getByRole('button', { name: /nueva tarea/i }).click();
    const modal = page.getByRole('dialog', { name: /nueva tarea/i });
    await modal.getByLabel(/título/i).fill('Tarea con Sesión Expirada');
    await modal.getByRole('button', { name: /crear tarea/i }).click();

    // Redirige al formulario de inicio de sesión con mensaje
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    const expiredAlert = page.getByRole('alert').filter({ hasText: /sesión ha expirado/i });
    await expect(expiredAlert).toBeVisible();
  });

  test('Slice 7: Operación con teclado (Enter para guardar) y vista móvil', async ({ page }) => {
    let postRequestSent = false;

    await page.route('**/api/tasks*', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        postRequestSent = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 't-keyboard',
            title: request.postDataJSON().title,
            status: 'pending',
            createdAt: new Date().toISOString(),
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: postRequestSent ? [{ id: 't-keyboard', title: 'Tarea creada con Enter', status: 'pending', createdAt: new Date().toISOString() }] : [],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    // Vista móvil 375x667
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/tasks');
    await loginAsOperator(page);

    // Botón visible y accesible en móvil
    const openCreateBtn = page.getByRole('button', { name: /nueva tarea/i });
    await expect(openCreateBtn).toBeVisible();
    await openCreateBtn.click();

    const modal = page.getByRole('dialog', { name: /nueva tarea/i });
    await expect(modal).toBeVisible();

    const titleInput = modal.getByLabel(/título/i);
    await titleInput.fill('Tarea creada con Enter');

    // Enviar formulario pulsando Enter en el input
    await page.keyboard.press('Enter');

    // Debe cerrarse el modal y crearse la tarea
    await expect(modal).not.toBeVisible();
    expect(postRequestSent).toBe(true);
    await expect(page.getByText('Tarea creada con Enter')).toBeVisible();
  });
});
