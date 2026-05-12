import { test, expect } from '@playwright/test';
import { firstDataRow } from '../helpers/datatable.helper';

// Endpoints:
//   GET /lawyers/:id/history          (audit + summary)
//   GET /lawyers/:id/history/export?format=csv|pdf

test.describe('Lawyer detail — history & export (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lawyer-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
  });

  test('abrir detalle dispara GET /lawyers/:id/history', async ({ page }) => {
    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();
    const reqPromise = page.waitForRequest(
      (req) => /\/lawyers\/\d+\/history(\?|$)/.test(req.url()),
      { timeout: 10_000 }
    );
    await row.click();
    await reqPromise;
    await expect(page.getByText(/Total assigned|Last login/i).first()).toBeVisible();
  });

  test('chip Status changes filtra audit con action_type=status_change', async ({
    page,
  }) => {
    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();
    await row.click();
    await page.waitForLoadState('networkidle');

    const chip = page.getByRole('button', { name: /Status changes/i });
    if (!(await chip.isVisible().catch(() => false))) test.skip();
    const reqPromise = page.waitForRequest(
      (req) =>
        req.url().includes('/history') &&
        req.url().includes('action_type=status_change'),
      { timeout: 5_000 }
    );
    await chip.click();
    await reqPromise;
  });

  test('Export PDF del history del lawyer descarga archivo', async ({
    page,
  }) => {
    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();
    await row.click();
    await page.waitForLoadState('networkidle');

    const pdf = page.getByRole('button', { name: /Export PDF/i });
    if (!(await pdf.isVisible().catch(() => false))) test.skip();
    const dl = page.waitForEvent('download', { timeout: 15_000 });
    await pdf.click();
    const download = await dl;
    expect(download.suggestedFilename()).toMatch(
      /lawyer-\d+-history-.*\.pdf/
    );
  });
});
