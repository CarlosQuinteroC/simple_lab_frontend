import { test, expect } from '@playwright/test';
import { setupAuthMocks, loginAsOperator, MOCK_AUTH_TOKEN as MOCK_TOKEN } from './fixtures/auth';

test.describe('Ticket 02: Filtrar y recorrer las tareas', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page);
  });

  test('Slice 1: Ofrece filtros Todas, Pendientes, En curso y Completadas, enviando status correcto y traduciendo estados', async ({ page }) => {
    const requestedUrls: string[] = [];

    await page.route('**/api/tasks*', async (route) => {
      const url = route.request().url();
      requestedUrls.push(url);

      const parsedUrl = new URL(url);
      const status = parsedUrl.searchParams.get('status');

      let items: Array<{ id: string; title: string; status: string; createdAt: string }> = [];
      if (!status) {
        items = [
          { id: '1', title: 'Tarea General 1', status: 'pending', createdAt: new Date().toISOString() },
          { id: '2', title: 'Tarea General 2', status: 'in_progress', createdAt: new Date().toISOString() },
          { id: '3', title: 'Tarea General 3', status: 'completed', createdAt: new Date().toISOString() },
        ];
      } else if (status === 'pending') {
        items = [{ id: '1', title: 'Tarea Pendiente A', status: 'pending', createdAt: new Date().toISOString() }];
      } else if (status === 'in_progress') {
        items = [{ id: '2', title: 'Tarea En Curso B', status: 'in_progress', createdAt: new Date().toISOString() }];
      } else if (status === 'completed') {
        items = [{ id: '3', title: 'Tarea Completada C', status: 'completed', createdAt: new Date().toISOString() }];
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items, page: 1, pageSize: 20 }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    // Verificar que existen los cuatro filtros
    const filterAll = page.getByRole('button', { name: /^Todas$/i });
    const filterPending = page.getByRole('button', { name: /^Pendientes$/i });
    const filterInProgress = page.getByRole('button', { name: /^En curso$/i });
    const filterCompleted = page.getByRole('button', { name: /^Completadas$/i });

    await expect(filterAll).toBeVisible();
    await expect(filterPending).toBeVisible();
    await expect(filterInProgress).toBeVisible();
    await expect(filterCompleted).toBeVisible();

    // Filtro inicial "Todas" no debe enviar status en la URL
    await expect(page.getByText('Tarea General 1')).toBeVisible();
    const initialUrl = new URL(requestedUrls[0]);
    expect(initialUrl.searchParams.get('status')).toBeNull();

    // Verificar traducciones de estado en las celdas
    await expect(page.getByRole('cell', { name: /^Pendiente$/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /^En curso$/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /^Completada$/i })).toBeVisible();

    // Filtrar por "Pendientes"
    await filterPending.click();
    await expect(page.getByText('Tarea Pendiente A')).toBeVisible();
    await expect(page.getByText('Tarea General 2')).not.toBeVisible();
    const pendingUrl = new URL(requestedUrls[requestedUrls.length - 1]);
    expect(pendingUrl.searchParams.get('status')).toBe('pending');

    // Filtrar por "En curso"
    await filterInProgress.click();
    await expect(page.getByText('Tarea En Curso B')).toBeVisible();
    const inProgressUrl = new URL(requestedUrls[requestedUrls.length - 1]);
    expect(inProgressUrl.searchParams.get('status')).toBe('in_progress');

    // Filtrar por "Completadas"
    await filterCompleted.click();
    await expect(page.getByText('Tarea Completada C')).toBeVisible();
    const completedUrl = new URL(requestedUrls[requestedUrls.length - 1]);
    expect(completedUrl.searchParams.get('status')).toBe('completed');

    // Volver a "Todas"
    await filterAll.click();
    await expect(page.getByText('Tarea General 1')).toBeVisible();
    const allUrl = new URL(requestedUrls[requestedUrls.length - 1]);
    expect(allUrl.searchParams.get('status')).toBeNull();
  });

  test('Slice 2 & 3: Paginación básica (Anterior/Siguiente) y reinicio a página 1 al cambiar de filtro', async ({ page }) => {
    const requestedParams: { page: string | null; pageSize: string | null; status: string | null }[] = [];

    await page.route('**/api/tasks*', async (route) => {
      const url = new URL(route.request().url());
      const pageParam = url.searchParams.get('page');
      const pageSizeParam = url.searchParams.get('pageSize');
      const statusParam = url.searchParams.get('status');

      requestedParams.push({
        page: pageParam,
        pageSize: pageSizeParam,
        status: statusParam,
      });

      const p = parseInt(pageParam || '1', 10);
      const isPending = statusParam === 'pending';

      const items = Array.from({ length: 20 }, (_, i) => ({
        id: `task-${p}-${i + 1}`,
        title: isPending ? `Tarea Pendiente P${p} #${i + 1}` : `Tarea P${p} #${i + 1}`,
        status: isPending ? 'pending' : 'in_progress',
        createdAt: new Date().toISOString(),
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items, page: p, pageSize: 20 }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    // En la primera página: Anterior debe estar deshabilitado
    const prevBtn = page.getByRole('button', { name: /^Anterior$/i });
    const nextBtn = page.getByRole('button', { name: /^Siguiente$/i });

    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();

    // No debe inventar contadores totales
    await expect(page.getByText(/total: \d+/i)).not.toBeVisible();
    await expect(page.getByText(/de \d+ páginas/i)).not.toBeVisible();

    // Ver tareas de la página 1
    await expect(page.getByText('Tarea P1 #1', { exact: true })).toBeVisible();

    // Avanzar a página 2
    await nextBtn.click();
    await expect(page.getByText('Tarea P2 #1', { exact: true })).toBeVisible();
    await expect(prevBtn).toBeEnabled();

    // Verificar parámetros enviados en la petición a página 2
    const lastRequest = requestedParams[requestedParams.length - 1];
    expect(lastRequest.page).toBe('2');
    expect(lastRequest.pageSize).toBe('20');

    // Cambiar de filtro estando en página 2 -> debe reiniciar a página 1
    const filterPending = page.getByRole('button', { name: /^Pendientes$/i });
    await filterPending.click();

    await expect(page.getByText('Tarea Pendiente P1 #1', { exact: true })).toBeVisible();
    const filterResetRequest = requestedParams[requestedParams.length - 1];
    expect(filterResetRequest.page).toBe('1');
    expect(filterResetRequest.status).toBe('pending');
    await expect(prevBtn).toBeDisabled();

    // Volver a página 1 usando botón Anterior si se avanza
    await nextBtn.click();
    await expect(page.getByText('Tarea Pendiente P2 #1', { exact: true })).toBeVisible();
    await expect(prevBtn).toBeEnabled();

    await prevBtn.click();
    await expect(page.getByText('Tarea Pendiente P1 #1', { exact: true })).toBeVisible();
    await expect(prevBtn).toBeDisabled();
  });

  test('Slice 4: Página parcial (< 20 elementos) deshabilita el botón Siguiente', async ({ page }) => {
    await page.route('**/api/tasks*', async (route) => {
      // Devolver solo 5 elementos en la primera página
      const items = Array.from({ length: 5 }, (_, i) => ({
        id: `partial-task-${i + 1}`,
        title: `Tarea Parcial #${i + 1}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items, page: 1, pageSize: 20 }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    const prevBtn = page.getByRole('button', { name: /^Anterior$/i });
    const nextBtn = page.getByRole('button', { name: /^Siguiente$/i });

    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // Como hay menos de 20 elementos, Siguiente debe estar deshabilitado
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeDisabled();
  });

  test('Slice 5: Página posterior vacía tras página de 20 elementos explica y permite volver', async ({ page }) => {
    await page.route('**/api/tasks*', async (route) => {
      const url = new URL(route.request().url());
      const p = parseInt(url.searchParams.get('page') || '1', 10);

      if (p === 1) {
        // Página 1: exactamente 20 elementos
        const items = Array.from({ length: 20 }, (_, i) => ({
          id: `task-p1-${i + 1}`,
          title: `Tarea P1 #${i + 1}`,
          status: 'completed',
          createdAt: new Date().toISOString(),
        }));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items, page: 1, pageSize: 20 }),
        });
      } else {
        // Página 2: vacía (0 elementos)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], page: 2, pageSize: 20 }),
        });
      }
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByText('Tarea P1 #1', { exact: true })).toBeVisible();

    const nextBtn = page.getByRole('button', { name: /^Siguiente$/i });
    await expect(nextBtn).toBeEnabled();

    // Avanzar a la página 2
    await nextBtn.click();

    // Verificar que explica que la página posterior está vacía
    await expect(page.getByRole('heading', { name: /página vacía/i })).toBeVisible();
    await expect(page.getByText(/no hay más tareas.*página 2/i)).toBeVisible();

    // Botón para volver a la página anterior
    const backBtn = page.getByRole('button', { name: /volver a la página anterior/i });
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Regresa a la página 1 y muestra las 20 tareas
    await expect(page.getByText('Tarea P1 #1', { exact: true })).toBeVisible();
    const prevBtn = page.getByRole('button', { name: /^Anterior$/i });
    await expect(prevBtn).toBeDisabled();
  });

  test('Slice 6: Distingue filtro sin resultados y mantiene navegables los filtros y paginación ante error de consulta', async ({ page }) => {
    let shouldFail = false;

    await page.route('**/api/tasks*', async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');
      const pageParam = url.searchParams.get('page');

      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Error de servidor' }),
        });
        return;
      }

      if (status === 'completed') {
        // Filtro sin resultados
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], page: 1, pageSize: 20 }),
        });
      } else {
        const p = parseInt(pageParam || '1', 10);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [{ id: `t${p}`, title: `Tarea Activa P${p}`, status: 'pending', createdAt: new Date().toISOString() }],
            page: p,
            pageSize: 20,
          }),
        });
      }
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByText('Tarea Activa P1')).toBeVisible();

    // Cambiar a "Completadas" (filtro sin resultados)
    const filterCompleted = page.getByRole('button', { name: /^Completadas$/i });
    await filterCompleted.click();

    // No debe ser presentado como alerta de error
    await expect(page.getByText('No hay tareas con este estado')).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: /error|fallo|servidor/i })).not.toBeVisible();

    // Simular error de servidor al cambiar a "Pendientes"
    shouldFail = true;
    const filterPending = page.getByRole('button', { name: /^Pendientes$/i });
    await filterPending.click();

    const alert = page.getByRole('alert').filter({ hasText: /error|fallo|servidor/i });
    await expect(alert).toBeVisible();

    // Los filtros deben seguir visibles y operables
    shouldFail = false;
    const filterAll = page.getByRole('button', { name: /^Todas$/i });
    await expect(filterAll).toBeEnabled();
    await filterAll.click();

    // Recupera la vista normalmente
    await expect(page.getByText('Tarea Activa P1')).toBeVisible();
    await expect(alert).not.toBeVisible();
  });

  test('Slice 7: Evita condiciones de carrera (respuestas lentas no sobreescriben filtro seleccionado)', async ({ page }) => {
    await page.route('**/api/tasks*', async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');

      if (status === 'pending') {
        // Petición deliberadamente lenta
        await new Promise((resolve) => setTimeout(resolve, 600));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [{ id: 'slow-pending', title: 'Tarea Pendiente Lenta', status: 'pending', createdAt: new Date().toISOString() }],
            page: 1,
            pageSize: 20,
          }),
        });
      } else if (status === 'completed') {
        // Petición rápida
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [{ id: 'fast-completed', title: 'Tarea Completada Rápida', status: 'completed', createdAt: new Date().toISOString() }],
            page: 1,
            pageSize: 20,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [{ id: 'all', title: 'Tarea Inicial Todas', status: 'in_progress', createdAt: new Date().toISOString() }],
            page: 1,
            pageSize: 20,
          }),
        });
      }
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByText('Tarea Inicial Todas')).toBeVisible();

    // Clic en Pendientes (lenta) y de inmediato en Completadas (rápida)
    await page.getByRole('button', { name: /^Pendientes$/i }).click();
    await page.getByRole('button', { name: /^Completadas$/i }).click();

    // Debe mostrar la tarea rápida de Completadas
    await expect(page.getByText('Tarea Completada Rápida')).toBeVisible();

    // Esperar a que la petición lenta de Pendientes termine en segundo plano
    await page.waitForTimeout(800);

    // Debe seguir mostrando la tarea Completada y NO la de Pendientes
    await expect(page.getByText('Tarea Completada Rápida')).toBeVisible();
    await expect(page.getByText('Tarea Pendiente Lenta')).not.toBeVisible();
  });

  test('Slice 8: Operación accesible con teclado y adaptabilidad móvil', async ({ page }) => {
    await page.route('**/api/tasks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: Array.from({ length: 20 }, (_, i) => ({
            id: `task-acc-${i + 1}`,
            title: `Tarea Accesible #${i + 1}`,
            status: 'pending',
            createdAt: new Date().toISOString(),
          })),
          page: 1,
          pageSize: 20,
        }),
      });
    });

    // Vista móvil
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/tasks');
    await loginAsOperator(page);

    // Verificar que los filtros son visibles en móvil y se pueden pulsar
    const filterPending = page.getByRole('button', { name: /^Pendientes$/i });
    await expect(filterPending).toBeVisible();

    // Paginación visible en móvil
    const nextBtn = page.getByRole('button', { name: /^Siguiente$/i });
    await expect(nextBtn).toBeVisible();

    // Navegación con teclado
    await filterPending.focus();
    await expect(filterPending).toBeFocused();

    // Tab a siguiente filtro "En curso"
    await page.keyboard.press('Tab');
    const filterInProgress = page.getByRole('button', { name: /^En curso$/i });
    await expect(filterInProgress).toBeFocused();
  });
});
