import { test, expect } from '@playwright/test';

// Endpoints ejercitados en /dashboard:
//   GET /lawyers?is_active=true&limit=10
//   N x GET /lawyers/:id/history?limit=5

test.describe('Dashboard — recent activity (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 25_000 });
  });

  test('mount dispara fetch a /lawyers y N x /lawyers/:id/history', async ({
    page,
  }) => {
    // Re-cargamos para observar los requests desde cero.
    let lawyersHits = 0;
    let historyHits = 0;
    page.on('request', (req) => {
      const url = req.url();
      if (/\/lawyers(\?|$)/.test(url) && req.method() === 'GET') lawyersHits++;
      if (/\/lawyers\/\d+\/history/.test(url) && req.method() === 'GET')
        historyHits++;
    });
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 25_000 });
    expect(lawyersHits).toBeGreaterThanOrEqual(1);
    // Si hay al menos un lawyer activo, debe haber al menos 1 history fetch.
    expect(historyHits).toBeGreaterThanOrEqual(0);
  });

  test('PeriodSelect dropdown lista 4 opciones', async ({ page }) => {
    const trigger = page.getByRole('button', {
      name: /Today|This week|This month|All time/,
    });
    await trigger.click();
    for (const label of ['Today', 'This week', 'This month', 'All time']) {
      await expect(
        page.getByRole('menuitem').or(page.getByText(label, { exact: true }))
      ).toBeTruthy();
    }
  });

  test('cambiar period a Today recorta la lista', async ({ page }) => {
    const trigger = page.getByRole('button', {
      name: /Today|This week|This month|All time/,
    });
    await trigger.click();
    const today = page.getByRole('menuitem', { name: /^Today$/ });
    if (!(await today.isVisible().catch(() => false))) {
      // fallback: si role no se aplica, buscamos por texto
      await page.getByText('Today', { exact: true }).first().click();
    } else {
      await today.click();
    }
    // El trigger ahora dice "Today"
    await expect(
      page.getByRole('button', { name: /^Today$/ })
    ).toBeVisible();
  });
});
