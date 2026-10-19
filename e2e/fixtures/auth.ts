import { Page } from '@playwright/test';

export const MOCK_AUTH_USER = {
  id: 'mock-user-id',
  email: 'operador@simplelab.local',
  aud: 'authenticated',
  role: 'authenticated',
};

export const MOCK_AUTH_TOKEN = 'mock-access-token-12345';

export async function setupAuthMocks(page: Page, user = MOCK_AUTH_USER, token = MOCK_AUTH_TOKEN) {
  await page.route('**/auth/v1/user*', async (route) => {
    const authHeader = route.request().headers()['authorization'];
    if (authHeader && authHeader.includes(token)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(user),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid token' }),
      });
    }
  });

  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user,
      }),
    });
  });

  await page.route('**/auth/v1/logout*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });
}

export async function loginAsOperator(page: Page, email = 'operador@simplelab.local', password = 'password123') {
  await page.getByLabel(/correo electrónico/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
}
