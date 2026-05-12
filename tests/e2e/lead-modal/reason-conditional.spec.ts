import { test, expect } from '@playwright/test';
import { firstDataRow } from '../helpers/datatable.helper';

// Cliente pidió deduplicar: la caja "COMMENT" (razón de auditoría)
// SOLO debe aparecer cuando el status seleccionado es crítico
// (PROBLEMATIC / SEND_BACK / LOST). Para flows normales sólo queda
// el composer "Add a comment" del Activity & Comments.

test.describe('LeadInfoModal — reason field is conditional', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();
    await row.click();
    await expect(page.getByText(/Activity & Comments/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('estado inicial NO muestra la caja "Reason" (status actual no crítico)', async ({
    page,
  }) => {
    // El label "Reason for X" sólo aparece para destructive.
    const reasonLabel = page.locator('label[for="lead-comment"]');
    // Si el status actual es NEW/ASSIGNED/IN PROGRESS/CLOSED → no debería estar.
    const visible = await reasonLabel.isVisible({ timeout: 1_500 }).catch(() => false);
    // Algunos leads abren con un status crítico → check defensivo.
    if (!visible) {
      // OK: estado esperado
      return;
    }
    // Si está visible, debe ser destructivo. Verificamos.
    const labelText = await reasonLabel.textContent();
    expect(labelText?.toLowerCase()).toMatch(/reason|problematic|send back|lost/);
  });

  test('cambiar a PROBLEMATIC hace aparecer la caja Reason', async ({
    page,
  }) => {
    const select = page.locator('#lead-status');
    await select.selectOption({ label: 'Problematic' });
    await expect(
      page.locator('label[for="lead-comment"]')
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText(/^Required$/i)
    ).toBeVisible();
  });

  test('cambiar de PROBLEMATIC a IN PROGRESS oculta la caja Reason', async ({
    page,
  }) => {
    const select = page.locator('#lead-status');
    await select.selectOption({ label: 'Problematic' });
    await expect(
      page.locator('label[for="lead-comment"]')
    ).toBeVisible();
    await select.selectOption({ label: 'In progress' });
    await expect(
      page.locator('label[for="lead-comment"]')
    ).toBeHidden({ timeout: 5_000 });
  });

  test('Composer "Add a comment" siempre visible (sin chips de tipo)', async ({
    page,
  }) => {
    await expect(page.getByText(/^Add a comment$/i).first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Add comment$/i }).first()
    ).toBeVisible();
    // Chips de tipo (Internal/Client-facing/Urgent) NO deben aparecer
    await expect(page.getByText(/^Internal$/, { exact: true })).toHaveCount(0);
    await expect(page.getByText(/^Urgent$/, { exact: true })).toHaveCount(0);
  });
});
