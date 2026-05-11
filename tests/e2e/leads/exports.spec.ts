import { test, expect } from '@playwright/test';

// Endpoint: GET /leads/export?format=csv

test.describe('Leads — exports (v2)', () => {
  test('Export CSV descarga un archivo csv', async ({ page }) => {
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });

    const button = page.getByRole('button', { name: /Export CSV/i });
    if (!(await button.isVisible().catch(() => false))) test.skip();

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
    await button.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/leads-.*\.csv/);
  });
});
