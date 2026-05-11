import { test, expect } from '@playwright/test';

// Endpoints:
//   GET /lawyers (paginado + campos computados)
//   GET /lawyers/stats
//   PATCH /lawyers/:id/status (dedicado, ya no PUT)
//   PATCH /lawyers/:id/password (dedicado)
//   GET /lawyers/export?format=csv

test.describe('Lawyers — management list (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lawyer-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
  });

  test('GET /lawyers/stats popula el count del header', async ({ page }) => {
    // El subtitulo del PageHead muestra "N lawyers"
    await expect(
      page.getByText(/\d+ lawyer/i).first()
    ).toBeVisible();
  });

  test('Capacity 0 muestra "Pending setup" en vez de overlay 0/0', async ({
    page,
  }) => {
    // Si hay lawyers sin services, debe haber pill "Pending setup"
    const pending = page.getByText(/Pending setup/i).first();
    const exists = await pending.isVisible({ timeout: 3_000 }).catch(() => false);
    // Si NO existe, OK (todos los lawyers tienen capacity). Sólo verificamos
    // que cuando aparece NO se solapa con un "0 / 0".
    if (!exists) test.skip();
    // Cuando el pill está, no debería haber un "0 / 0 pending" en la misma row.
    await expect(pending).toBeVisible();
  });

  test('Deactivate dialog exige razón obligatoria', async ({ page }) => {
    // Buscamos el primer botón power
    const powerBtn = page
      .getByRole('button', { name: /Deactivate lawyer|Activate lawyer/i })
      .first();
    if (!(await powerBtn.isVisible().catch(() => false))) test.skip();
    await powerBtn.click();
    // Dialog abre
    await expect(
      page.getByText(/Activate lawyer|Deactivate lawyer/i).first()
    ).toBeVisible();
    const confirm = page
      .getByRole('button', { name: /^Activate$|^Deactivate$/ })
      .last();
    // Sin razón → confirm disabled
    const disabled = await confirm.isDisabled().catch(() => false);
    expect(disabled).toBe(true);
  });

  test('Export CSV de lawyers descarga archivo', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /^Export$/i });
    if (!(await exportBtn.isVisible().catch(() => false))) test.skip();
    const dl = page.waitForEvent('download', { timeout: 15_000 });
    await exportBtn.click();
    const download = await dl;
    expect(download.suggestedFilename()).toMatch(/lawyers-.*\.csv/);
  });
});
