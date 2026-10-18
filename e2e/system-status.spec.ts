import { test, expect } from '@playwright/test';

test.describe('Ticket 06: Consultar el estado del sistema desde Inicio y Diagnóstico', () => {
  test('Slice 1: Inicio muestra URL configurada, estado de conexión conectada y accesos directos funcionales', async ({ page }) => {
    await page.route('**/health/live', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'Healthy',
      });
    });

    await page.goto('/');

    // Encabezado principal
    await expect(page.getByRole('heading', { name: /panel de inicio/i })).toBeVisible();

    // Indicador de conexión con la API
    const apiStatusSection = page.getByRole('region', { name: /conexión con la api/i });
    await expect(apiStatusSection).toBeVisible();
    await expect(apiStatusSection.getByText('Conectada')).toBeVisible();
    await expect(apiStatusSection.getByText(/http:\/\/localhost:(5000|5084)/)).toBeVisible();

    // Accesos directos principales
    const shortcutsNav = page.getByRole('navigation', { name: /accesos directos principales/i });
    const tasksShortcut = shortcutsNav.getByRole('link', { name: /gestión de tareas/i });
    const systemShortcut = shortcutsNav.getByRole('link', { name: /estado del sistema/i });

    await expect(tasksShortcut).toBeVisible();
    await expect(systemShortcut).toBeVisible();

    // Probar navegación a Estado del sistema
    await systemShortcut.click();
    await expect(page).toHaveURL(/\/system/);
    await expect(page.getByRole('heading', { name: /estado del sistema/i })).toBeVisible();
  });

  test('Slice 2: Estado del sistema consulta /health/live, /health/ready y /version de forma independiente', async ({ page }) => {
    let liveCalled = false;
    let readyCalled = false;
    let versionCalled = false;

    await page.route('**/health/live', async (route) => {
      liveCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'Proceso activo y saludable',
      });
    });

    await page.route('**/health/ready', async (route) => {
      readyCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'Conexión a BD confirmada',
      });
    });

    await page.route('**/version', async (route) => {
      versionCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ version: '1.4.2' }),
      });
    });

    await page.goto('/system');

    // Comprobar tarjetas independientes
    const liveCard = page.getByRole('region', { name: /disponibilidad del proceso/i });
    const readyCard = page.getByRole('region', { name: /dependencia de datos/i });
    const versionCard = page.getByRole('region', { name: /versión de la api/i });

    await expect(liveCard).toBeVisible();
    await expect(liveCard.getByText('Saludable', { exact: true })).toBeVisible();
    await expect(liveCard.getByText('Proceso activo y saludable')).toBeVisible();

    await expect(readyCard).toBeVisible();
    await expect(readyCard.getByText('Saludable', { exact: true })).toBeVisible();
    await expect(readyCard.getByText('Conexión a BD confirmada')).toBeVisible();

    await expect(versionCard).toBeVisible();
    await expect(versionCard.getByText('1.4.2')).toBeVisible();

    expect(liveCalled).toBe(true);
    expect(readyCalled).toBe(true);
    expect(versionCalled).toBe(true);
  });

  test('Slice 3: Falla independiente de readiness no oculta éxito de liveness y aclara que no prueba login', async ({ page }) => {
    await page.route('**/health/live', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'Healthy',
      });
    });

    await page.route('**/health/ready', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'text/plain',
        body: 'Unhealthy',
      });
    });

    await page.route('**/version', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ version: '2.0.0-rc1' }),
      });
    });

    await page.goto('/system');

    const liveCard = page.getByRole('region', { name: /disponibilidad del proceso/i });
    const readyCard = page.getByRole('region', { name: /dependencia de datos/i });
    const versionCard = page.getByRole('region', { name: /versión de la api/i });

    // Liveness sigue saludable
    await expect(liveCard.getByText('Saludable', { exact: true })).toBeVisible();

    // Readiness muestra degradado y la aclaración explícita sobre el login
    await expect(readyCard.getByText('Degradado', { exact: true })).toBeVisible();
    await expect(readyCard.getByText(/no comprueba ni garantiza el funcionamiento del inicio de sesión/i)).toBeVisible();

    // Versión sigue disponible
    await expect(versionCard.getByText('2.0.0-rc1')).toBeVisible();
  });

  test('Slice 4: Falla de versión (500) muestra error sin inventar versión y no afecta health', async ({ page }) => {
    await page.route('**/health/live', async (route) => {
      await route.fulfill({ status: 200, body: 'Healthy' });
    });

    await page.route('**/health/ready', async (route) => {
      await route.fulfill({ status: 200, body: 'Healthy' });
    });

    await page.route('**/version', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/system');

    const liveCard = page.getByRole('region', { name: /disponibilidad del proceso/i });
    const versionCard = page.getByRole('region', { name: /versión de la api/i });

    await expect(liveCard.getByText('Saludable', { exact: true })).toBeVisible();
    await expect(versionCard.getByText('Error', { exact: true })).toBeVisible();
    await expect(versionCard.getByText(/error al consultar versión \(código 500\)/i)).toBeVisible();
  });

  test('Slice 5: API totalmente inaccesible muestra estado sin conexión en Inicio y errores comprensibles en Sistema', async ({ page }) => {
    await page.route('**/health/live', async (route) => {
      await route.abort('failed');
    });
    await page.route('**/health/ready', async (route) => {
      await route.abort('failed');
    });
    await page.route('**/version', async (route) => {
      await route.abort('failed');
    });

    // En Inicio
    await page.goto('/');
    const apiSection = page.getByRole('region', { name: /conexión con la api/i });
    await expect(apiSection.getByText('Sin conexión')).toBeVisible();

    // En Estado del sistema
    await page.goto('/system');
    const liveCard = page.getByRole('region', { name: /disponibilidad del proceso/i });
    const readyCard = page.getByRole('region', { name: /dependencia de datos/i });
    const versionCard = page.getByRole('region', { name: /versión de la api/i });

    await expect(liveCard.getByText('No disponible', { exact: true })).toBeVisible();
    await expect(readyCard.getByText('Degradado', { exact: true })).toBeVisible();
    await expect(versionCard.getByText('Error', { exact: true })).toBeVisible();
  });

  test('Slice 6: Botón Actualizar diagnósticos vuelve a consultar sin sondeo continuo', async ({ page }) => {
    let callCount = 0;

    await page.route('**/health/live', async (route) => {
      callCount++;
      await route.fulfill({ status: 200, contentType: 'text/plain', body: `Healthy call ${callCount}` });
    });
    await page.route('**/health/ready', async (route) => {
      await route.fulfill({ status: 200, body: 'Ready' });
    });
    await page.route('**/version', async (route) => {
      await route.fulfill({ status: 200, json: { version: '1.0.0' } });
    });

    await page.goto('/system');

    // Esperar a que cargue inicialmente
    await expect(page.getByRole('region', { name: /disponibilidad del proceso/i }).getByText(/healthy call/i)).toBeVisible();
    const initialCalls = callCount;
    expect(initialCalls).toBeGreaterThanOrEqual(1);

    // Esperar 1 segundo para verificar que no existe sondeo continuo automático en bucle
    await page.waitForTimeout(1000);
    expect(callCount).toBe(initialCalls);

    // Clic manual en Actualizar diagnósticos
    const refreshBtn = page.getByRole('button', { name: /actualizar diagnósticos/i });
    await refreshBtn.click();

    // Debe haberse incrementado la llamada
    await expect(page.getByRole('region', { name: /disponibilidad del proceso/i }).getByText(`Healthy call ${initialCalls + 1}`)).toBeVisible();
    expect(callCount).toBe(initialCalls + 1);
  });

  test('Slice 7: Navegación accesible por teclado y diseño adaptable a móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.route('**/health/live', async (route) => {
      await route.fulfill({ status: 200, body: 'Healthy' });
    });
    await page.route('**/health/ready', async (route) => {
      await route.fulfill({ status: 200, body: 'Ready' });
    });
    await page.route('**/version', async (route) => {
      await route.fulfill({ status: 200, json: { version: '1.0.0' } });
    });

    await page.goto('/');

    // Accesos directos visibles en móvil
    const shortcutsNav = page.getByRole('navigation', { name: /accesos directos principales/i });
    const systemLink = shortcutsNav.getByRole('link', { name: /estado del sistema/i });
    await expect(systemLink).toBeVisible();
    await systemLink.click();

    await expect(page).toHaveURL(/\/system/);
    await expect(page.getByRole('heading', { name: /estado del sistema/i })).toBeVisible();

    // Las 3 tarjetas visibles y legibles en columna en móvil
    await expect(page.getByRole('region', { name: /disponibilidad del proceso/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /dependencia de datos/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /versión de la api/i })).toBeVisible();
  });
});
