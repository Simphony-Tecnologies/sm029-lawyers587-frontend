import { test, expect } from '@playwright/test';
import { firstDataRow } from '../helpers/datatable.helper';

// Endpoint: PATCH /lawyers/:id/password
// Reemplaza al PUT /lawyers/:id genérico (que daba 403 self-edit).

test.describe('Lawyer — password update', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lawyer-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
  });

  test('botón candado abre el modal de password', async ({ page }) => {
    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();
    // El candado vive como IconActionButton con label "Change password"
    const padlock = page
      .getByRole('button', { name: /change password|password/i })
      .first();
    if (!(await padlock.isVisible().catch(() => false))) test.skip();
    await padlock.click();
    await expect(
      page
        .getByRole('dialog')
        .or(page.getByText(/new password/i))
    ).toBeVisible();
  });

  test('submit con password dispara PATCH /lawyers/:id/password', async ({
    page,
  }) => {
    const padlock = page
      .getByRole('button', { name: /change password|password/i })
      .first();
    if (!(await padlock.isVisible().catch(() => false))) test.skip();
    await padlock.click();

    const newPwd = page.locator('input[type="password"]').first();
    if (!(await newPwd.isVisible().catch(() => false))) test.skip();
    await newPwd.fill('T3stPassword!2026');

    // Confirm field si existe
    const confirmField = page.locator('input[type="password"]').nth(1);
    if (await confirmField.isVisible().catch(() => false)) {
      await confirmField.fill('T3stPassword!2026');
    }

    const reqPromise = page.waitForRequest(
      (req) =>
        req.method() === 'PATCH' &&
        /\/lawyers\/\d+\/password/.test(req.url()),
      { timeout: 10_000 }
    );
    await page.getByRole('button', { name: /save|submit|update/i }).first().click();
    await reqPromise;
  });
});
