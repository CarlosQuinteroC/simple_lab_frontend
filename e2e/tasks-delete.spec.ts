import { test, expect, Page } from '@playwright/test';

test.describe('Ticket 05: Eliminar tareas con confirmación', () => {
  const MOCK_TOKEN = 'mock-access-token-t05';
  const MOCK_USER = {
    id: 'user-t05',
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

  test('Slice 1: Abre modal de confirmación con nombre de tarea, foco seguro en Cancelar, y al cancelar no envía DELETE', async ({ page }) => {
    let deleteRequestSent = false;

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      if (request.method() === 'DELETE') {
        deleteRequestSent = true;
        await route.fulfill({ status: 204 });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: 'task-del-1', title: 'Muestra a conservar', status: 'pending', createdAt: new Date().toISOString() },
          ],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    const row = page.locator('tr[data-task-id="task-del-1"]');
    await expect(row).toBeVisible();

    const deleteBtn = row.getByRole('button', { name: /eliminar/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Modal de confirmación
    const modal = page.getByRole('dialog', { name: /eliminar tarea/i });
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Muestra a conservar')).toBeVisible();

    // Foco automático en el botón Cancelar por precaución
    const cancelBtn = modal.getByRole('button', { name: /cancelar/i });
    await expect(cancelBtn).toBeFocused();

    // Cancelar
    await cancelBtn.click();
    await expect(modal).not.toBeVisible();
    expect(deleteRequestSent).toBe(false);

    // La tarea sigue en el listado
    await expect(page.getByText('Muestra a conservar')).toBeVisible();

    // Reabrir y cancelar con Escape
    await deleteBtn.click();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    expect(deleteRequestSent).toBe(false);
  });

  test('Slice 2: Confirmación envía DELETE con Bearer token, interpreta 204 como éxito, bloquea doble envío y refresca lista', async ({ page }) => {
    const deleteRequests: { url: string; headers: Record<string, string> }[] = [];
    let itemsInBackend = [
      { id: 'task-del-2', title: 'Reactivo para descarte', status: 'pending' as const, createdAt: new Date().toISOString() },
    ];

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      if (request.method() === 'DELETE') {
        deleteRequests.push({
          url: request.url(),
          headers: request.headers(),
        });
        itemsInBackend = [];
        // Delay to assert "Eliminando..." state
        await new Promise((res) => setTimeout(res, 300));
        // Return 204 No Content
        await route.fulfill({ status: 204 });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: itemsInBackend,
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByText('Reactivo para descarte')).toBeVisible();

    const row = page.locator('tr[data-task-id="task-del-2"]');
    await row.getByRole('button', { name: /eliminar/i }).click();

    const modal = page.getByRole('dialog', { name: /eliminar tarea/i });
    const confirmBtn = modal.getByRole('button', { name: /eliminar tarea/i });

    await confirmBtn.click();

    // Durante el borrado: muestra "Eliminando..." y botones deshabilitados
    await expect(modal.getByRole('button', { name: /eliminando/i })).toBeDisabled();
    await expect(modal.getByRole('button', { name: /cancelar/i })).toBeDisabled();

    // Modal se cierra
    await expect(modal).not.toBeVisible();

    // Petición DELETE emitida correctamente
    expect(deleteRequests.length).toBe(1);
    expect(deleteRequests[0].url).toContain('/api/tasks/task-del-2');
    expect(deleteRequests[0].headers['authorization']).toBe(`Bearer ${MOCK_TOKEN}`);

    // La tarea ya no está en el listado
    await expect(page.getByText('Reactivo para descarte')).not.toBeVisible();
  });

  test('Slice 3: Conserva el filtro activo tras eliminar exitosamente', async ({ page }) => {
    let itemsInBackend = [
      { id: 'task-del-p1', title: 'Tarea pendiente 1', status: 'pending' as const, createdAt: new Date().toISOString() },
      { id: 'task-del-p2', title: 'Tarea pendiente 2', status: 'pending' as const, createdAt: new Date().toISOString() },
    ];

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === 'DELETE') {
        const idToDelete = url.pathname.split('/').pop();
        itemsInBackend = itemsInBackend.filter((item) => item.id !== idToDelete);
        await route.fulfill({ status: 204 });
        return;
      }

      const statusParam = url.searchParams.get('status');
      const filtered = statusParam
        ? itemsInBackend.filter((item) => item.status === statusParam)
        : itemsInBackend;

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

    // Cambiar al filtro Pendientes
    const pendingTab = page.getByRole('button', { name: 'Pendientes', exact: true });
    await pendingTab.click();
    await expect(pendingTab).toHaveAttribute('aria-pressed', 'true');

    // Eliminar la primera
    const row = page.locator('tr[data-task-id="task-del-p1"]');
    await row.getByRole('button', { name: /eliminar/i }).click();

    const modal = page.getByRole('dialog', { name: /eliminar tarea/i });
    await modal.getByRole('button', { name: /eliminar tarea/i }).click();
    await expect(modal).not.toBeVisible();

    // Filtro sigue siendo Pendientes
    await expect(pendingTab).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Tarea pendiente 1')).not.toBeVisible();
    await expect(page.getByText('Tarea pendiente 2')).toBeVisible();
  });

  test('Slice 4: Eliminar último elemento en página 2 retrocede a página 1 automáticamente', async ({ page }) => {
    let page2Items = [
      { id: 'task-p2-lone', title: 'Elemento Solitario P2', status: 'pending' as const, createdAt: new Date().toISOString() },
    ];

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === 'DELETE') {
        page2Items = [];
        await route.fulfill({ status: 204 });
        return;
      }

      const p = Number(url.searchParams.get('page') || '1');
      if (p === 1) {
        const full20Items = Array.from({ length: 20 }, (_, i) => ({
          id: `task-p1-${i + 1}`,
          title: `Tarea Página 1 - #${i + 1}`,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        }));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: full20Items,
            page: 1,
            pageSize: 20,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: page2Items,
            page: 2,
            pageSize: 20,
          }),
        });
      }
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByText('Tarea Página 1 - #1', { exact: true })).toBeVisible();

    // Avanzar a página 2
    const nextBtn = page.getByRole('button', { name: /siguiente/i });
    await nextBtn.click();

    await expect(page.getByRole('navigation', { name: /paginación/i }).getByText('Página 2')).toBeVisible();
    await expect(page.getByText('Elemento Solitario P2')).toBeVisible();

    // Eliminar el elemento solitario de la página 2
    const row = page.locator('tr[data-task-id="task-p2-lone"]');
    await row.getByRole('button', { name: /eliminar/i }).click();

    const modal = page.getByRole('dialog', { name: /eliminar tarea/i });
    await modal.getByRole('button', { name: /eliminar tarea/i }).click();
    await expect(modal).not.toBeVisible();

    // Debe retroceder automáticamente a Página 1 y consultar las tareas de la página 1
    await expect(page.getByRole('navigation', { name: /paginación/i }).getByText('Página 1')).toBeVisible();
    await expect(page.getByText('Tarea Página 1 - #1', { exact: true })).toBeVisible();
  });

  test('Slice 5: Eliminar la última tarea de la página 1 muestra estado vacío sin consultar página 0', async ({ page }) => {
    let itemsInBackend = [
      { id: 'task-last-one', title: 'Última tarea en el sistema', status: 'pending' as const, createdAt: new Date().toISOString() },
    ];
    const requestedPages: number[] = [];

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === 'DELETE') {
        itemsInBackend = [];
        await route.fulfill({ status: 204 });
        return;
      }

      const p = Number(url.searchParams.get('page') || '1');
      requestedPages.push(p);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: itemsInBackend,
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByText('Última tarea en el sistema')).toBeVisible();

    const row = page.locator('tr[data-task-id="task-last-one"]');
    await row.getByRole('button', { name: /eliminar/i }).click();

    const modal = page.getByRole('dialog', { name: /eliminar tarea/i });
    await modal.getByRole('button', { name: /eliminar tarea/i }).click();
    await expect(modal).not.toBeVisible();

    // Muestra estado vacío
    await expect(page.getByText('No hay tareas registradas')).toBeVisible();
    // Jamás solicita una página 0
    expect(requestedPages.includes(0)).toBe(false);
  });

  test('Slice 6: Error al eliminar (500 o 404) muestra mensaje, no retira la tarea y permite reintentar', async ({ page }) => {
    let failDelete = true;
    let itemsInBackend = [
      { id: 'task-err-1', title: 'Tarea con error de eliminación', status: 'pending' as const, createdAt: new Date().toISOString() },
    ];

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      if (request.method() === 'DELETE') {
        if (failDelete) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Error en la base de datos al eliminar.' }),
          });
          return;
        }

        itemsInBackend = [];
        await route.fulfill({ status: 204 });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: itemsInBackend,
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    const row = page.locator('tr[data-task-id="task-err-1"]');
    await row.getByRole('button', { name: /eliminar/i }).click();

    const modal = page.getByRole('dialog', { name: /eliminar tarea/i });
    const confirmBtn = modal.getByRole('button', { name: /eliminar tarea/i });

    // Intento 1: falla 500
    await confirmBtn.click();

    // Muestra alerta de error
    const alert = modal.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Error en el servidor al eliminar la tarea.');

    // El modal NO se cierra y la tarea sigue en el listado detrás
    await expect(row.getByText('Tarea con error de eliminación', { exact: true })).toBeVisible();

    // Reintento exitoso
    failDelete = false;
    await confirmBtn.click();

    await expect(modal).not.toBeVisible();
    await expect(page.getByText('Tarea con error de eliminación')).not.toBeVisible();
  });

  test('Slice 7: Sesión expirada (401 en DELETE) redirige a login con mensaje', async ({ page }) => {
    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      if (request.method() === 'DELETE') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Token expirado' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: 'task-401', title: 'Tarea para probar 401', status: 'pending', createdAt: new Date().toISOString() },
          ],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    const row = page.locator('tr[data-task-id="task-401"]');
    await row.getByRole('button', { name: /eliminar/i }).click();

    const modal = page.getByRole('dialog', { name: /eliminar tarea/i });
    await modal.getByRole('button', { name: /eliminar tarea/i }).click();

    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByText(/su sesión ha expirado o no es válida/i)).toBeVisible();
  });

  test('Slice 8: Accesible en vista móvil y utilizable mediante teclado', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    let deleteCalled = false;

    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      if (request.method() === 'DELETE') {
        deleteCalled = true;
        await route.fulfill({ status: 204 });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: 'task-mobile', title: 'Borrado en móvil', status: 'pending', createdAt: new Date().toISOString() },
          ],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    const row = page.locator('tr[data-task-id="task-mobile"]');
    const deleteBtn = row.getByRole('button', { name: /eliminar/i });
    await deleteBtn.click();

    const modal = page.getByRole('dialog', { name: /eliminar tarea/i });
    await expect(modal).toBeVisible();

    // Confirmar con el botón
    const confirmBtn = modal.getByRole('button', { name: /eliminar tarea/i });
    await confirmBtn.click();

    await expect(modal).not.toBeVisible();
    expect(deleteCalled).toBe(true);
  });
});
