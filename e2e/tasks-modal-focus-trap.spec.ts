import { test, expect } from '@playwright/test';
import { setupAuthMocks, loginAsOperator } from './fixtures/auth';

test.describe('Contención de foco y fondo inerte en modales', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page);

    await page.route('**/api/tasks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'task-1',
              title: 'Tarea de prueba foco',
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
          page: 1,
          pageSize: 20,
        }),
      });
    });
  });

  test('Modal Nueva tarea contiene el foco con Tab y Shift+Tab y vuelve inerte el fondo', async ({ page }) => {
    await page.goto('/tasks');
    await loginAsOperator(page);

    const newBtn = page.getByRole('button', { name: /nueva tarea/i });
    await expect(newBtn).toBeVisible();
    await newBtn.click();

    const modal = page.getByRole('dialog', { name: /nueva tarea/i });
    await expect(modal).toBeVisible();

    // 1. Verificar que elementos del fondo tienen el atributo inert
    const inertElements = page.locator('[inert]');
    expect(await inertElements.count()).toBeGreaterThan(0);

    // 2. Verificar foco inicial en el input de título
    const titleInput = modal.getByLabel(/título/i);
    await expect(titleInput).toBeFocused();

    // 3. Tabular hacia adelante por los controles del modal
    // De titleInput -> Cancelar -> Crear tarea -> Cerrar modal -> titleInput
    await page.keyboard.press('Tab');
    await expect(modal.getByRole('button', { name: /cancelar/i })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(modal.getByRole('button', { name: /crear tarea/i })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(modal.getByRole('button', { name: /cerrar modal/i })).toBeFocused();

    // 4. Tab desde el último control debe ciclar al primer control dentro del modal (titleInput)
    await page.keyboard.press('Tab');
    await expect(titleInput).toBeFocused();

    // 5. Shift+Tab desde el primer control debe ciclar hacia atrás al último control (Cerrar modal)
    await page.keyboard.press('Shift+Tab');
    await expect(modal.getByRole('button', { name: /cerrar modal/i })).toBeFocused();

    // 6. Al cerrar el modal con Escape, el fondo deja de ser inerte y el foco regresa al botón disparador
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await expect(page.locator('[data-modal-inerted]')).toHaveCount(0);
    await expect(newBtn).toBeFocused();
  });

  test('Modal Editar tarea contiene el foco y no permite alcanzar controles del fondo', async ({ page }) => {
    await page.goto('/tasks');
    await loginAsOperator(page);

    const editBtn = page.getByRole('button', { name: /editar tarea/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const modal = page.getByRole('dialog', { name: /editar tarea/i });
    await expect(modal).toBeVisible();

    const titleInput = modal.getByLabel(/título/i);
    await expect(titleInput).toBeFocused();

    // Ciclar con Tab: titleInput -> Estado -> Cancelar -> Guardar cambios -> Cerrar modal -> titleInput
    await page.keyboard.press('Tab');
    await expect(modal.getByLabel(/estado/i)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(modal.getByRole('button', { name: /cancelar/i })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(modal.getByRole('button', { name: /guardar cambios/i })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(modal.getByRole('button', { name: /cerrar modal/i })).toBeFocused();

    // Wrap around to title input
    await page.keyboard.press('Tab');
    await expect(titleInput).toBeFocused();

    // Shift+Tab wrap around to close button
    await page.keyboard.press('Shift+Tab');
    await expect(modal.getByRole('button', { name: /cerrar modal/i })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await expect(editBtn).toBeFocused();
  });

  test('Modal Eliminar tarea contiene el foco en Cancelar / Eliminar / Cerrar', async ({ page }) => {
    await page.goto('/tasks');
    await loginAsOperator(page);

    const deleteBtn = page.getByRole('button', { name: /eliminar tarea/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    const modal = page.getByRole('dialog', { name: /eliminar tarea/i });
    await expect(modal).toBeVisible();

    // Foco inicial seguro en Cancelar
    const cancelBtn = modal.getByRole('button', { name: /cancelar/i });
    await expect(cancelBtn).toBeFocused();

    // Tab -> Eliminar tarea -> Cerrar modal -> Cancelar
    await page.keyboard.press('Tab');
    await expect(modal.getByRole('button', { name: /eliminar tarea/i })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(modal.getByRole('button', { name: /cerrar modal/i })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(cancelBtn).toBeFocused();

    // Shift+Tab -> Cerrar modal
    await page.keyboard.press('Shift+Tab');
    await expect(modal.getByRole('button', { name: /cerrar modal/i })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await expect(deleteBtn).toBeFocused();
  });
  test('Al confirmar la eliminación de la última tarea, el foco se devuelve a un control disponible (Nueva tarea) y no al body', async ({ page }) => {
    let items = [
      { id: 'focus-task-1', title: 'Tarea para eliminar y verificar foco', status: 'pending', createdAt: new Date().toISOString() },
    ];
    await page.route(/\/api\/tasks/, async (route) => {
      const request = route.request();
      if (request.method() === 'DELETE') {
        items = [];
        await route.fulfill({ status: 204 });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items, page: 1, pageSize: 20 }),
      });
    });

    await page.goto('/tasks');
    await loginAsOperator(page);

    const deleteBtn = page.getByRole('button', { name: /eliminar tarea/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    const modal = page.getByRole('dialog', { name: /eliminar tarea/i });
    await expect(modal).toBeVisible();

    await modal.getByRole('button', { name: /eliminar tarea/i }).click();
    await expect(modal).not.toBeVisible();

    // The deleted button is gone from the DOM and empty state is rendered
    await expect(page.getByText('No hay tareas registradas')).toBeVisible();

    // Focus must NOT be on body, it must be on an available control like Nueva tarea
    const newBtn = page.getByRole('button', { name: /nueva tarea/i });
    await expect(newBtn).toBeFocused();
  });
});
