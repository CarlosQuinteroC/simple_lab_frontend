import { test, expect, Page } from '@playwright/test';

test.describe('Ticket 04: Editar título y estado', () => {
  const MOCK_TOKEN = 'mock-access-token-t04';
  const MOCK_USER = {
    id: 'user-t04',
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

  test('Slice 1: Abre modal desde botón Editar en una tarea con título y estado precargados, foco en título, y cancela sin enviar PUT', async ({ page }) => {
    let putRequestSent = false;

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      if (request.method() === 'PUT') {
        putRequestSent = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'task-101',
            title: 'No debería cambiar',
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
            { id: 'task-101', title: 'Análisis de muestra inicial', status: 'pending', createdAt: new Date().toISOString() },
          ],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByText('Análisis de muestra inicial')).toBeVisible();

    // Botón de editar para la tarea
    const row = page.locator('tr[data-task-id="task-101"]');
    await expect(row).toBeVisible();
    const editBtn = row.getByRole('button', { name: /editar/i });
    await expect(editBtn).toBeVisible();

    // Abrir modal de edición
    await editBtn.click();

    // Modal debe abrirse con rol dialog y título Editar tarea
    const modal = page.getByRole('dialog', { name: /editar tarea/i });
    await expect(modal).toBeVisible();

    // Campo de título debe tener foco automático y contener el título actual
    const titleInput = modal.getByLabel(/título/i);
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toBeFocused();
    await expect(titleInput).toHaveValue('Análisis de muestra inicial');

    // Campo de estado debe estar precargado con el estado actual (pending)
    const statusSelect = modal.getByLabel(/estado/i);
    await expect(statusSelect).toBeVisible();
    await expect(statusSelect).toHaveValue('pending');

    // Cancelar usando el botón Cancelar
    const cancelBtn = modal.getByRole('button', { name: /cancelar/i });
    await cancelBtn.click();

    // Modal se cierra y no se envió ningún PUT
    await expect(modal).not.toBeVisible();
    expect(putRequestSent).toBe(false);

    // Reabrir y probar cierre con tecla Escape
    await editBtn.click();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    expect(putRequestSent).toBe(false);
  });

  test('Slice 2: Validación de título obligatorio, rechazo de solo espacios y límite de 200 caracteres', async ({ page }) => {
    let putRequestSent = false;

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      if (request.method() === 'PUT') {
        putRequestSent = true;
        await route.fulfill({ status: 200, json: {} });
        return;
      }
      await route.fulfill({
        status: 200,
        json: {
          items: [{ id: 'task-102', title: 'Tarea original', status: 'pending', createdAt: new Date().toISOString() }],
          page: 1,
          pageSize: 20,
        },
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    const row = page.locator('tr[data-task-id="task-102"]');
    await row.getByRole('button', { name: /editar/i }).click();

    const modal = page.getByRole('dialog', { name: /editar tarea/i });
    const titleInput = modal.getByLabel(/título/i);
    const saveButton = modal.getByRole('button', { name: /guardar cambios/i });

    // 1. Borrar título por completo e intentar guardar
    await titleInput.fill('');
    await saveButton.click();
    await expect(modal.getByText('El título de la tarea es obligatorio.')).toBeVisible();
    expect(putRequestSent).toBe(false);

    // 2. Título compuesto únicamente de espacios
    await titleInput.fill('      ');
    await saveButton.click();
    await expect(modal.getByText('El título de la tarea es obligatorio.')).toBeVisible();
    expect(putRequestSent).toBe(false);

    // 3. Escribir texto válido limpia el error
    await titleInput.fill('Título nuevo válido');
    await expect(modal.getByText('El título de la tarea es obligatorio.')).not.toBeVisible();

    // 4. Límite de 200 caracteres en el input
    const longTitle = 'B'.repeat(250);
    await titleInput.fill(longTitle);
    const currentValue = await titleInput.inputValue();
    expect(currentValue.length).toBe(200);
    expect(currentValue).toBe('B'.repeat(200));
  });

  test('Slice 3: Edición exitosa envía PUT con título y estado con Bearer token, previene doble envío y refresca lista', async ({ page }) => {
    const putRequests: { url: string; payload: unknown; headers: Record<string, string> }[] = [];

    let currentTask = {
      id: 'task-103',
      title: 'Título anterior',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      if (request.method() === 'PUT') {
        const payload = JSON.parse(request.postData() || '{}');
        putRequests.push({
          url: request.url(),
          payload,
          headers: request.headers(),
        });

        currentTask = {
          ...currentTask,
          title: payload.title,
          status: payload.status,
        };

        // Artificial delay to test "Guardando..." indicator and disabled controls
        await new Promise((res) => setTimeout(res, 300));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(currentTask),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [currentTask],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByText('Título anterior')).toBeVisible();

    const row = page.locator('tr[data-task-id="task-103"]');
    await row.getByRole('button', { name: /editar/i }).click();

    const modal = page.getByRole('dialog', { name: /editar tarea/i });
    const titleInput = modal.getByLabel(/título/i);
    const statusSelect = modal.getByLabel(/estado/i);
    const saveButton = modal.getByRole('button', { name: /guardar cambios/i });

    // Modificar título y estado
    await titleInput.fill('Título editado correctamente');
    await statusSelect.selectOption('in_progress');

    // Clic en guardar
    await saveButton.click();

    // Comprobar indicador de guardado y controles bloqueados
    await expect(modal.getByRole('button', { name: /guardando/i })).toBeDisabled();
    await expect(titleInput).toBeDisabled();
    await expect(statusSelect).toBeDisabled();

    // Esperar a que finalice el guardado y el modal se cierre
    await expect(modal).not.toBeVisible();

    // Verificar petición PUT emitida
    expect(putRequests.length).toBe(1);
    expect(putRequests[0].url).toContain('/api/tasks/task-103');
    expect(putRequests[0].payload).toEqual({
      title: 'Título editado correctamente',
      status: 'in_progress',
    });
    expect(putRequests[0].headers['authorization']).toBe(`Bearer ${MOCK_TOKEN}`);

    // Verificar que el listado muestra el nuevo título y nuevo estado en la fila correspondiente
    const updatedRow = page.locator('tr[data-task-id="task-103"]');
    await expect(updatedRow.getByText('Título editado correctamente')).toBeVisible();
    await expect(updatedRow.getByText('En curso', { exact: true })).toBeVisible();
  });

  test('Slice 4: Si la tarea ya no cumple el filtro activo tras la edición, deja de mostrarse en dicho filtro sin reiniciar el filtro', async ({ page }) => {
    let tasksInBackend = [
      { id: 'task-104', title: 'Calibración de espectrómetro', status: 'pending' as const, createdAt: new Date().toISOString() },
    ];

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === 'PUT') {
        const payload = JSON.parse(request.postData() || '{}');
        tasksInBackend = tasksInBackend.map((t) =>
          t.id === 'task-104' ? { ...t, title: payload.title, status: payload.status } : t
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(tasksInBackend[0]),
        });
        return;
      }

      // GET filtering
      const statusParam = url.searchParams.get('status');
      const filtered = statusParam
        ? tasksInBackend.filter((t) => t.status === statusParam)
        : tasksInBackend;

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

    // Seleccionar filtro "Pendientes"
    const pendingTab = page.getByRole('button', { name: 'Pendientes', exact: true });
    await pendingTab.click();
    await expect(pendingTab).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Calibración de espectrómetro')).toBeVisible();

    // Abrir modal de edición
    const row = page.locator('tr[data-task-id="task-104"]');
    await row.getByRole('button', { name: /editar/i }).click();

    const modal = page.getByRole('dialog', { name: /editar tarea/i });
    const statusSelect = modal.getByLabel(/estado/i);
    // Cambiar estado a "Completada"
    await statusSelect.selectOption('completed');
    await modal.getByRole('button', { name: /guardar cambios/i }).click();

    // El modal se cierra
    await expect(modal).not.toBeVisible();

    // El filtro sigue siendo "Pendientes"
    await expect(pendingTab).toHaveAttribute('aria-pressed', 'true');

    // La tarea ya no cumple el filtro de "Pendientes", por lo que no debe aparecer
    await expect(page.getByText('Calibración de espectrómetro')).not.toBeVisible();
    await expect(page.getByText('No hay tareas con este estado')).toBeVisible();

    // Al cambiar al filtro "Completadas", la tarea aparece con su nuevo estado
    const completedTab = page.getByRole('button', { name: 'Completadas', exact: true });
    await completedTab.click();
    const completedRow = page.locator('tr[data-task-id="task-104"]');
    await expect(completedRow.getByText('Calibración de espectrómetro')).toBeVisible();
    await expect(completedRow.getByText('Completada', { exact: true })).toBeVisible();
  });

  test('Slice 5: Error del servidor (500) o no disponible (404) muestra mensaje claro, conserva datos y permite reintentar', async ({ page }) => {
    let failPut = true;
    let task105 = {
      id: 'task-105',
      title: 'Título original',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      if (request.method() === 'PUT') {
        if (failPut) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Error interno en la base de datos de tareas.' }),
          });
          return;
        }

        const payload = JSON.parse(request.postData() || '{}');
        task105 = {
          ...task105,
          title: payload.title,
          status: payload.status,
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(task105),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [task105],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    const row = page.locator('tr[data-task-id="task-105"]');
    await row.getByRole('button', { name: /editar/i }).click();

    const modal = page.getByRole('dialog', { name: /editar tarea/i });
    const titleInput = modal.getByLabel(/título/i);
    const statusSelect = modal.getByLabel(/estado/i);
    const saveButton = modal.getByRole('button', { name: /guardar cambios/i });

    // Modificar datos
    await titleInput.fill('Título preservado tras reintento');
    await statusSelect.selectOption('completed');

    // Primer intento: falla con 500
    await saveButton.click();

    // Alerta de error visible
    const alert = modal.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Error en el servidor al actualizar la tarea.');

    // El modal NO se cierra y los valores modificados se conservan intactos
    await expect(titleInput).toHaveValue('Título preservado tras reintento');
    await expect(statusSelect).toHaveValue('completed');

    // Desactivar fallo y reintentar
    failPut = false;
    await saveButton.click();

    // Tras el reintento exitoso, el modal se cierra y la lista se actualiza
    await expect(modal).not.toBeVisible();
    await expect(page.getByText('Título preservado tras reintento')).toBeVisible();
  });

  test('Slice 6: Sesión expirada (401 en PUT) redirige a la pantalla de login con mensaje', async ({ page }) => {
    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      if (request.method() === 'PUT') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Token de acceso inválido o expirado' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [{ id: 'task-106', title: 'Tarea para expiración', status: 'pending', createdAt: new Date().toISOString() }],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    const row = page.locator('tr[data-task-id="task-106"]');
    await row.getByRole('button', { name: /editar/i }).click();

    const modal = page.getByRole('dialog', { name: /editar tarea/i });
    await modal.getByLabel(/título/i).fill('Cambio que expirará');
    await modal.getByRole('button', { name: /guardar cambios/i }).click();

    // Debe mostrar la vista de login con mensaje de expiración de sesión
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByText(/su sesión ha expirado o no es válida/i)).toBeVisible();
  });

  test('Slice 7: Operación con teclado (Enter para guardar) y vista móvil', async ({ page }) => {
    // Configurar viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });

    let putReceived = false;
    let task107 = {
      id: 'task-107',
      title: 'Tarea en móvil',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      if (request.method() === 'PUT') {
        putReceived = true;
        const payload = JSON.parse(request.postData() || '{}');
        task107 = {
          ...task107,
          title: payload.title,
          status: payload.status,
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(task107),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [task107],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    const row = page.locator('tr[data-task-id="task-107"]');
    await row.getByRole('button', { name: /editar/i }).click();

    const modal = page.getByRole('dialog', { name: /editar tarea/i });
    await expect(modal).toBeVisible();

    const titleInput = modal.getByLabel(/título/i);
    await titleInput.fill('Guardado con Enter en móvil');
    await modal.getByLabel(/estado/i).selectOption('completed');

    // Presionar Enter en el formulario
    await titleInput.press('Enter');

    // Modal se cierra y PUT fue procesado
    await expect(modal).not.toBeVisible();
    expect(putReceived).toBe(true);
    await expect(page.getByText('Guardado con Enter en móvil')).toBeVisible();
  });
});
