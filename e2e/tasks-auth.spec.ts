import { test, expect, Page } from '@playwright/test';

test.describe('Ticket 01: Iniciar sesión y consultar tareas', () => {
  const MOCK_TOKEN = 'mock-access-token-xyz';
  const MOCK_USER = {
    id: 'user-123',
    email: 'operador@simplelab.local',
  };

  async function loginAsOperator(page: Page, email = 'operador@simplelab.local', password = 'password123') {
    await page.getByLabel(/correo electrónico/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
  }

  test.beforeEach(async ({ page }) => {
    // Intercept Supabase Auth user request
    await page.route('**/auth/v1/user*', async (route) => {
      const authHeader = route.request().headers()['authorization'];
      if (authHeader && authHeader.includes('mock-token')) {
        const isUser2 = authHeader.includes('mock-token-user-2');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            isUser2
              ? { id: 'user-456', email: 'operador2@simplelab.local' }
              : MOCK_USER
          ),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid token' }),
        });
      }
    });

    // Intercept Supabase logout request
    await page.route('**/auth/v1/logout*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      });
    });
  });

  test('Slice 1 & 2: Muestra login al no estar autenticado y maneja credenciales inválidas', async ({ page }) => {
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      const postData = route.request().postDataJSON();
      if (postData?.email === 'bad@lab.com' || postData?.password === 'wrong') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
          }),
        });
      }
    });

    await page.goto('/tasks');

    const emailInput = page.getByLabel(/correo electrónico/i);
    const passwordInput = page.getByLabel(/contraseña/i);
    const submitBtn = page.getByRole('button', { name: /iniciar sesión/i });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    await emailInput.fill('bad@lab.com');
    await passwordInput.fill('wrong');
    await submitBtn.click();

    const errorAlert = page.getByRole('alert').filter({ hasText: /credenciales inválidas|incorrecto|error/i });
    await expect(errorAlert).toBeVisible();
  });

  test('Slice 3 & 4: Login válido, envío de Bearer token y consulta de las primeras 20 tareas', async ({ page }) => {
    let capturedAuthHeader: string | undefined;

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

    const mockTasks = Array.from({ length: 20 }, (_, i) => ({
      id: `task-uuid-${i + 1}`,
      title: `Tarea de laboratorio #${i + 1}`,
      status: i % 3 === 0 ? 'pending' : i % 3 === 1 ? 'in_progress' : 'completed',
      createdAt: new Date(Date.UTC(2026, 9, 18, 10, i)).toISOString(),
    }));

    await page.route('**/api/tasks*', async (route) => {
      capturedAuthHeader = route.request().headers()['authorization'];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: mockTasks,
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByRole('heading', { name: /tareas de laboratorio/i })).toBeVisible();

    await expect(page.getByText('Tarea de laboratorio #1', { exact: true })).toBeVisible();
    await expect(page.getByText('Tarea de laboratorio #20', { exact: true })).toBeVisible();

    await expect(page.getByText('Pendiente').first()).toBeVisible();
    await expect(page.getByText('En curso').first()).toBeVisible();
    await expect(page.getByText('Completada').first()).toBeVisible();

    expect(capturedAuthHeader).toBe(`Bearer ${MOCK_TOKEN}`);
    await expect(page.getByText(/total: \d+/i)).not.toBeVisible();
  });

  test('Slice 5: Distingue listado vacío sin presentarlo como error', async ({ page }) => {
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

    await page.route('**/api/tasks*', async (route) => {
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

    await expect(page.getByText(/no hay tareas registradas/i)).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: /error/i })).not.toBeVisible();
  });

  test('Slice 6: Maneja error de red (500) y reintento', async ({ page }) => {
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

    let shouldFail = true;
    await page.route('**/api/tasks*', async (route) => {
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'task-recovered',
                title: 'Tarea Recuperada Tras Reintento',
                status: 'pending',
                createdAt: new Date().toISOString(),
              },
            ],
            page: 1,
            pageSize: 20,
          }),
        });
      }
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    const errorAlert = page.getByRole('alert').filter({ hasText: /error en el servidor|error al conectar/i });
    await expect(errorAlert).toBeVisible();

    // Ahora habilitar respuesta exitosa y pulsar reintentar
    shouldFail = false;
    const retryBtn = page.getByRole('button', { name: /reintentar/i });
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    await expect(page.getByText('Tarea Recuperada Tras Reintento')).toBeVisible();
  });

  test('Slice 6 (cont): Maneja sesión inválida o expirada (401 de API) redirigiendo a login', async ({ page }) => {
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

    await page.route('**/api/tasks*', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByLabel(/correo electrónico/i)).toBeVisible();
    const errorAlert = page.getByRole('alert').filter({ hasText: /expirado|no es válida/i });
    await expect(errorAlert).toBeVisible();
  });

  test('Slice 7a: Persistencia tras recarga de página', async ({ page }) => {
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

    await page.route('**/api/tasks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'task-persistent',
              title: 'Tarea Persistente Tras Recarga',
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
          page: 1,
          pageSize: 20,
        }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    await expect(page.getByText('Tarea Persistente Tras Recarga')).toBeVisible();

    // Recargar página
    await page.reload();
    await expect(page.getByText('Tarea Persistente Tras Recarga')).toBeVisible();
  });

  test('Slice 7b: Cierre de sesión y cambio de usuario no conservan datos anteriores', async ({ page }) => {
    let currentToken = MOCK_TOKEN;
    let currentUser = MOCK_USER;

    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      const postData = route.request().postDataJSON();
      if (postData?.email === 'operador2@simplelab.local') {
        currentToken = 'mock-token-user-2';
        currentUser = { id: 'user-456', email: 'operador2@simplelab.local' };
      } else {
        currentToken = MOCK_TOKEN;
        currentUser = MOCK_USER;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: currentToken,
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: currentUser,
        }),
      });
    });

    await page.route('**/api/tasks*', async (route) => {
      const auth = route.request().headers()['authorization'];
      if (auth && auth.includes('mock-token-user-2')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'task-user2',
                title: 'Tarea Exclusiva Operador 2',
                status: 'in_progress',
                createdAt: new Date().toISOString(),
              },
            ],
            page: 1,
            pageSize: 20,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'task-user1',
                title: 'Tarea Confidencial Operador 1',
                status: 'pending',
                createdAt: new Date().toISOString(),
              },
            ],
            page: 1,
            pageSize: 20,
          }),
        });
      }
    });

    await page.goto('/tasks');
    await loginAsOperator(page, 'operador@simplelab.local');

    await expect(page.getByText('Tarea Confidencial Operador 1')).toBeVisible();

    // Cerrar sesión
    const logoutBtn = page.getByTestId('logout-button');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Regresa al login y no muestra la tarea confidencial
    await expect(page.getByLabel(/correo electrónico/i)).toBeVisible();
    await expect(page.getByText('Tarea Confidencial Operador 1')).not.toBeVisible();

    // Iniciar sesión como Operador 2
    await loginAsOperator(page, 'operador2@simplelab.local');

    // Muestra la tarea de Operador 2 y nunca la de Operador 1
    await expect(page.getByText('Tarea Exclusiva Operador 2')).toBeVisible();
    await expect(page.getByText('Tarea Confidencial Operador 1')).not.toBeVisible();
  });

  test('Slice 7c: Sustitución directa de sesión entre cuentas reinicia el estado y cierra modales abiertos con datos previos', async ({ page }) => {
    await page.route('**/auth/v1/user*', async (route) => {
      const auth = route.request().headers()['authorization'];
      if (auth && auth.includes('mock-token-user-2')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-operator-2',
            email: 'operador2@simplelab.local',
            aud: 'authenticated',
            role: 'authenticated',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_USER),
        });
      }
    });

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

    await page.route('**/api/tasks*', async (route) => {
      const auth = route.request().headers()['authorization'];
      if (auth && auth.includes('mock-token-user-2')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'task-user-2',
                title: 'Tarea Exclusiva de Cuenta B',
                status: 'in_progress',
                createdAt: new Date().toISOString(),
              },
            ],
            page: 1,
            pageSize: 20,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'task-user-1',
                title: 'Tarea Confidencial de Cuenta A',
                status: 'pending',
                createdAt: new Date().toISOString(),
              },
            ],
            page: 1,
            pageSize: 20,
          }),
        });
      }
    });

    await page.goto('/tasks');
    await loginAsOperator(page, 'operador@simplelab.local');

    await expect(page.getByText('Tarea Confidencial de Cuenta A')).toBeVisible();

    // Abrir modal de edición en la Cuenta A
    const editBtn = page.getByRole('button', { name: /editar tarea/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const editModal = page.getByRole('dialog', { name: /editar tarea/i });
    await expect(editModal).toBeVisible();
    await expect(editModal.getByRole('textbox', { name: /título/i })).toHaveValue('Tarea Confidencial de Cuenta A');

    // Simular sustitución directa de sesión mediante el canal multiventana (BroadcastChannel) de Supabase
    await page.evaluate(() => {
      const storageKey =
        Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token')) ||
        'sb-wpoaiywnjoonbjjogdeo-auth-token';
      const session2 = {
        access_token: 'mock-token-user-2',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token-2',
        user: {
          id: 'user-operator-2',
          email: 'operador2@simplelab.local',
          aud: 'authenticated',
          role: 'authenticated',
        },
      };
      localStorage.setItem(storageKey, JSON.stringify(session2));
      const bc = new BroadcastChannel(storageKey);
      bc.postMessage({
        event: 'SIGNED_IN',
        session: session2,
      });
    });

    // Al sustituirse la sesión a la Cuenta B:
    // 1. El modal de edición de la Cuenta A debe desmontarse / no conservarse
    await expect(editModal).not.toBeVisible();

    // 2. Las tareas de la Cuenta A ya no deben mostrarse
    await expect(page.getByText('Tarea Confidencial de Cuenta A')).not.toBeVisible();

    // 3. Deben mostrarse las tareas correspondientes a la Cuenta B
    await expect(page.getByText('Tarea Exclusiva de Cuenta B')).toBeVisible();
  });

  test('Slice 8: Navegación lateral y diseño accesible en vista móvil y con teclado', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    const menuBtn = page.getByRole('button', { name: /abrir menú de navegación/i });
    await expect(menuBtn).toBeVisible();

    await menuBtn.click();

    const mobileNav = page.getByRole('navigation', { name: /navegación móvil/i });
    await expect(mobileNav.getByRole('link', { name: 'Inicio' })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Tareas' })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Estado del sistema' })).toBeVisible();

    await mobileNav.getByRole('link', { name: 'Tareas' }).click();
    await expect(page).toHaveURL(/\/tasks/);

    const emailInput = page.getByLabel(/correo electrónico/i);
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    await page.keyboard.type('test@keyboard.com');
    await page.keyboard.press('Tab');

    const passwordInput = page.getByLabel(/contraseña/i);
    await expect(passwordInput).toBeFocused();
  });
});
