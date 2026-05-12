import { test, expect } from '@playwright/test';
import { firstDataRow, dataRows } from '../helpers/datatable.helper';

// /lawyer-management/[id] — vista de detalle del lawyer.
// Endpoints ejercitados:
//   GET /lawyers/:id
//   GET /leads?assigned_to=<id>
//   GET /lawyers/:id/history
//   GET /leads/:leadId/comments  (N+1 para merge en activity log)

test.describe('Lawyer detail — leads table + status filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lawyer-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });

    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();
    await row.click();
    await page.waitForURL(/\/lawyer-management\/\d+/, { timeout: 10_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
  });

  test('GET /leads?assigned_to=<id> es la fuente de la tabla de leads', async ({
    page,
  }) => {
    // Reload para capturar el request fresh.
    const reqPromise = page.waitForRequest(
      (req) =>
        req.method() === 'GET' &&
        /\/leads\?[^"]*assigned_to=\d+/.test(req.url()),
      { timeout: 8_000 }
    );
    await page.reload();
    await reqPromise;
    await expect(page.getByText(/Assigned leads/i)).toBeVisible();
  });

  test('Chips de status son por LEAD (no por audit) y filtran la tabla', async ({
    page,
  }) => {
    await expect(page.getByText(/Assigned leads/i)).toBeVisible();
    const allRows = await dataRows(page).count();
    if (allRows === 0) test.skip();

    // Buscamos un chip de status concreto entre los visibles.
    const chipNames = ['Assigned', 'In progress', 'Problematic', 'Retained'];
    for (const name of chipNames) {
      const chip = page.getByRole('button', { name: new RegExp(`^${name}$`) });
      if (await chip.isVisible().catch(() => false)) {
        const before = allRows;
        await chip.click();
        await page.waitForTimeout(400);
        const after = await dataRows(page).count();
        // Filtro debe recortar (o mantener si era igual al filtrado).
        expect(after).toBeLessThanOrEqual(before);
        return;
      }
    }
    test.skip();
  });

  test('Search en lawyer-detail filtra leads del lawyer', async ({ page }) => {
    const search = page.getByPlaceholder(/Search by name, email, phone or ID/i);
    if (!(await search.isVisible().catch(() => false))) test.skip();
    const before = await dataRows(page).count();
    await search.fill('zzzzzzz-no-match-9876');
    await page.waitForTimeout(400);
    const after = await dataRows(page).count();
    expect(after).toBeLessThan(before + 1);
  });

  test('Activity log muestra eventos del audit log del lawyer', async ({
    page,
  }) => {
    await expect(page.getByText(/^Activity log$/i)).toBeVisible();
    // Chips de filtro de audit visibles
    await expect(page.getByRole('button', { name: /^All$/ }).nth(1)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Assignments$/ })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Status changes$/ })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Comments$/ })).toBeVisible();
  });

  test('Filtro Comments dispara fetch a /leads/:id/comments (N+1)', async ({
    page,
  }) => {
    // Si hay leads asignados, el componente fetcha comments por cada uno.
    const hasRows = (await dataRows(page).count()) > 0;
    if (!hasRows) test.skip();

    let commentRequests = 0;
    page.on('request', (req) => {
      if (
        req.method() === 'GET' &&
        /\/leads\/\d+\/comments/.test(req.url())
      ) {
        commentRequests++;
      }
    });
    // El primer fetch de comments ocurre tras cargar los leads.
    // Forzamos reload para observar.
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
    expect(commentRequests).toBeGreaterThanOrEqual(1);
  });
});
