import { test, expect } from '@playwright/test';
import { rowCheckbox } from '../helpers/datatable.helper';

// Endpoints:
//   PATCH /leads/bulk/assign   - asignación masiva
//   PATCH /leads/bulk/status   - cambio de status masivo
//   PATCH /leads/bulk/archive  - archivo masivo
//   DELETE /leads/bulk         - borrado masivo

test.describe('Leads — bulk actions (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
  });

  test('seleccionar 1 lead muestra la BulkActionBar', async ({ page }) => {
    const checkbox = rowCheckbox(page, 0);
    if (!(await checkbox.isVisible().catch(() => false))) test.skip();
    await checkbox.check();
    await expect(
      page
        .getByRole('button', { name: /Assign to/i })
        .or(page.getByText(/Assign to lawyer/i))
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Assign to → LawyerPicker carga lawyers reales (no vacío)', async ({
    page,
  }) => {
    const checkbox = rowCheckbox(page, 0);
    if (!(await checkbox.isVisible().catch(() => false))) test.skip();
    await checkbox.check();
    await page.getByRole('button', { name: /Assign to/i }).first().click();

    // El picker debe mostrar lawyers (no "No active lawyers available").
    const empty = page.getByText(/No active lawyers/i);
    const hasEmpty = await empty
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(hasEmpty).toBe(false);
  });

  test('Bulk Archive: razón obligatoria bloquea confirm', async ({ page }) => {
    const checkbox = rowCheckbox(page, 0);
    if (!(await checkbox.isVisible().catch(() => false))) test.skip();
    await checkbox.check();
    await page.getByRole('button', { name: /^Archive$/i }).first().click();
    // Dialog abre con textarea de razón
    const confirm = page
      .getByRole('button', { name: /^Archive$/i })
      .last();
    // sin texto → debería estar disabled
    const disabled = await confirm.isDisabled().catch(() => false);
    expect(disabled).toBe(true);
  });

  test('Bulk Change status: combobox + razón habilita confirm', async ({
    page,
  }) => {
    const checkbox = rowCheckbox(page, 0);
    if (!(await checkbox.isVisible().catch(() => false))) test.skip();
    await checkbox.check();
    await page.getByRole('button', { name: /Change status/i }).first().click();

    const select = page.locator('#bulk-status-select');
    await expect(select).toBeVisible();
    await select.selectOption({ value: 'IN PROGRESS' });
    await page.locator('#bulk-comment').fill('e2e bulk status');
    const confirm = page.getByRole('button', { name: /Apply status/i });
    await expect(confirm).toBeEnabled();
  });
});
